import { decode } from 'base64-arraybuffer';

import { getSupabaseClient } from '../lib/supabase/client';
import { logTripActivity, sendTripNotification } from './notificationService';
import {
  CloseDestinationPollFormValues,
  DestinationCustomFieldFormValues,
  DestinationSetupFormValues,
  DestinationVoteFormValues,
  ParsedUpsertDestinationCustomFieldValuesFormValues,
  ParsedDestinationProposalFormValues,
  UpdateDestinationCustomFieldFormValues,
  closeDestinationPollSchema,
  destinationCustomFieldSchema,
  destinationSetupSchema,
  destinationVoteSchema,
  fetchLinkMetadataSchema,
  updateDestinationCustomFieldSchema,
  upsertDestinationCustomFieldValuesSchema,
} from '../lib/validation/destination';
import {
  DestinationCustomField,
  DestinationCustomFieldRow,
  DestinationCustomFieldValue,
  DestinationCustomFieldValueRow,
  DestinationPoll,
  DestinationPollBundle,
  DestinationPollResult,
  DestinationPollResultRow,
  DestinationPollRow,
  DestinationProposal,
  DestinationProposalImage,
  DestinationProposalImageRow,
  DestinationProposalRow,
  DestinationVote,
  DestinationVoteRow,
  LinkMetadata,
  mapDestinationCustomFieldRow,
  mapDestinationCustomFieldValueRow,
  mapDestinationPollResultRow,
  mapDestinationPollRow,
  mapDestinationProposalImageRow,
  mapDestinationProposalRow,
  mapDestinationVoteRow,
} from '../types/destination';

const pollSelect = 'id, trip_id, status, created_by, closed_at, created_at';
const proposalSelect =
  'id, trip_id, poll_id, created_by, title, description, url, location_text, estimated_price_cents, currency_code, price_per_person_cents, capacity, bedrooms, bathrooms, pros, cons, selected_at, created_at, updated_at';
const resultSelect =
  'id, poll_id, proposal_id, vote_count, total_member_count, score, rank, is_winner, is_tied_winner, computed_at';
const customFieldSelect =
  'id, trip_id, poll_id, created_by, name, emoji, field_type, show_on_card, required, sort_order, created_at, updated_at';
const customFieldValueSelect =
  'id, proposal_id, field_id, value_text, value_number, value_money_cents, value_boolean, value_url, created_at, updated_at';

export async function getLatestDestinationPollBundle(tripId: string): Promise<DestinationPollBundle> {
  const supabase = getSupabaseClient();
  const { data: pollRow, error: pollError } = await supabase
    .from('polls')
    .select(pollSelect)
    .eq('trip_id', tripId)
    .eq('type', 'destination')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<DestinationPollRow>();

  if (pollError) {
    throw new Error(pollError.message);
  }

  if (!pollRow) {
    return {
      poll: null,
      proposals: [],
    };
  }

  return {
    poll: mapDestinationPollRow(pollRow),
    proposals: await listDestinationProposals(tripId, pollRow.id),
  };
}

export async function createDestinationPoll(
  userId: string,
  values: DestinationSetupFormValues,
): Promise<DestinationPoll> {
  const parsed = destinationSetupSchema.parse(values);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('polls')
    .insert({
      trip_id: parsed.tripId,
      type: 'destination',
      status: 'active',
      created_by: userId,
    })
    .select(pollSelect)
    .single<DestinationPollRow>();

  if (error) {
    throw new Error(error.message);
  }

  const { error: tripError } = await supabase
    .from('trips')
    .update({ status: 'voting_place' })
    .eq('id', parsed.tripId);

  if (tripError) {
    throw new Error(tripError.message);
  }

  return mapDestinationPollRow(data);
}

export async function listDestinationProposals(
  tripId: string,
  pollId: string,
): Promise<DestinationProposal[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('destination_proposals')
    .select(proposalSelect)
    .eq('trip_id', tripId)
    .eq('poll_id', pollId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .returns<DestinationProposalRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapDestinationProposalRow);
}

export async function getDestinationProposal(proposalId: string): Promise<DestinationProposal | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('destination_proposals')
    .select(proposalSelect)
    .eq('id', proposalId)
    .is('deleted_at', null)
    .maybeSingle<DestinationProposalRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapDestinationProposalRow(data) : null;
}

export async function createDestinationProposal(
  userId: string,
  parsed: ParsedDestinationProposalFormValues,
): Promise<DestinationProposal> {
  const supabase = getSupabaseClient();
  const currencyCode =
    parsed.totalPriceCents !== null || parsed.pricePerPersonCents !== null ? parsed.currencyCode : null;
  const { data, error } = await supabase
    .from('destination_proposals')
    .insert({
      trip_id: parsed.tripId,
      poll_id: parsed.pollId,
      created_by: userId,
      title: parsed.title,
      url: parsed.url,
      description: parsed.description?.trim() || null,
      location_text: parsed.locationName?.trim() || null,
      estimated_price_cents: parsed.totalPriceCents,
      currency_code: currencyCode,
      price_per_person_cents: parsed.pricePerPersonCents,
      capacity: parsed.capacity,
      bedrooms: parsed.bedrooms,
      bathrooms: parsed.bathrooms,
      pros: parsed.pros,
      cons: parsed.cons,
    })
    .select(proposalSelect)
    .single<DestinationProposalRow>();

  if (error) {
    throw new Error(error.message);
  }

  const proposal = mapDestinationProposalRow(data);

  if (parsed.imageBase64 && parsed.imageContentType && parsed.imageFileExtension) {
    await uploadProposalImage({
      userId,
      tripId: parsed.tripId,
      proposalId: proposal.id,
      base64: parsed.imageBase64,
      contentType: parsed.imageContentType,
      fileExtension: parsed.imageFileExtension,
    });
  }

  if (parsed.customFieldValues.length > 0) {
    await upsertDestinationCustomFieldValues({
      proposalId: proposal.id,
      values: parsed.customFieldValues,
    });
  }

  await logNonBlocking(() =>
    logTripActivity({
      tripId: proposal.tripId,
      eventType: 'destination_proposal_created',
      metadata: {
        proposal_id: proposal.id,
        poll_id: proposal.pollId,
        title: proposal.title,
      },
    }),
  );
  await logNonBlocking(() =>
    sendTripNotification({
      tripId: proposal.tripId,
      eventType: 'new_proposal',
      title: 'New proposal',
      body: proposal.title,
      metadata: {
        proposal_id: proposal.id,
        poll_id: proposal.pollId,
      },
    }),
  );

  return proposal;
}

export async function listDestinationCustomFields(
  tripId: string,
  pollId?: string | null,
): Promise<DestinationCustomField[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('destination_custom_fields')
    .select(customFieldSelect)
    .eq('trip_id', tripId)
    .is('deleted_at', null);

  if (pollId) {
    query = query.or(`poll_id.is.null,poll_id.eq.${pollId}`);
  }

  const { data, error } = await query
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .returns<DestinationCustomFieldRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapDestinationCustomFieldRow);
}

export async function createDestinationCustomField(
  userId: string,
  values: DestinationCustomFieldFormValues,
): Promise<DestinationCustomField> {
  const parsed = destinationCustomFieldSchema.parse(values);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('destination_custom_fields')
    .insert({
      trip_id: parsed.tripId,
      poll_id: parsed.pollId,
      created_by: userId,
      name: parsed.name,
      emoji: parsed.emoji?.trim() || null,
      field_type: parsed.fieldType,
      show_on_card: parsed.showOnCard,
      required: parsed.required,
      sort_order: parsed.sortOrder,
    })
    .select(customFieldSelect)
    .single<DestinationCustomFieldRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapDestinationCustomFieldRow(data);
}

export async function updateDestinationCustomField(
  values: UpdateDestinationCustomFieldFormValues,
): Promise<DestinationCustomField> {
  const parsed = updateDestinationCustomFieldSchema.parse(values);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('destination_custom_fields')
    .update({
      trip_id: parsed.tripId,
      poll_id: parsed.pollId,
      name: parsed.name,
      emoji: parsed.emoji?.trim() || null,
      field_type: parsed.fieldType,
      show_on_card: parsed.showOnCard,
      required: parsed.required,
      sort_order: parsed.sortOrder,
    })
    .eq('id', parsed.id)
    .select(customFieldSelect)
    .single<DestinationCustomFieldRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapDestinationCustomFieldRow(data);
}

export async function deleteDestinationCustomField(fieldId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('destination_custom_fields')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', fieldId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function listDestinationCustomFieldValues(
  proposalId: string,
): Promise<DestinationCustomFieldValue[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('destination_custom_field_values')
    .select(customFieldValueSelect)
    .eq('proposal_id', proposalId)
    .returns<DestinationCustomFieldValueRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapDestinationCustomFieldValueRow);
}

export async function upsertDestinationCustomFieldValues(
  values: ParsedUpsertDestinationCustomFieldValuesFormValues,
): Promise<DestinationCustomFieldValue[]> {
  const parsed = upsertDestinationCustomFieldValuesSchema.parse(values);

  if (parsed.values.length === 0) {
    return [];
  }

  const supabase = getSupabaseClient();
  const rows = parsed.values.map((value) => ({
    proposal_id: parsed.proposalId,
    field_id: value.fieldId,
    value_text: value.valueText,
    value_number: value.valueNumber,
    value_money_cents: value.valueMoneyCents,
    value_boolean: value.valueBoolean,
    value_url: value.valueUrl,
  }));
  const { data, error } = await supabase
    .from('destination_custom_field_values')
    .upsert(rows, { onConflict: 'proposal_id,field_id' })
    .select(customFieldValueSelect)
    .returns<DestinationCustomFieldValueRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapDestinationCustomFieldValueRow);
}

export async function listProposalImages(proposalId: string): Promise<DestinationProposalImage[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('destination_proposal_images')
    .select('id, proposal_id, storage_path, alt_text, sort_order')
    .eq('proposal_id', proposalId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .returns<DestinationProposalImageRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapDestinationProposalImageRow);
}

export async function createProposalImageSignedUrl(storagePath: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from('proposal-images')
    .createSignedUrl(storagePath, 60 * 10);

  if (error) {
    throw new Error(error.message);
  }

  return data.signedUrl;
}

export async function voteForDestinationProposal(values: DestinationVoteFormValues): Promise<DestinationVote> {
  const parsed = destinationVoteSchema.parse(values);
  const supabase = getSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from('destination_votes')
    .select('id')
    .eq('trip_id', parsed.tripId)
    .eq('poll_id', parsed.pollId)
    .eq('user_id', parsed.userId)
    .maybeSingle<{ id: string }>();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const query = existing
    ? supabase
        .from('destination_votes')
        .update({ proposal_id: parsed.proposalId })
        .eq('id', existing.id)
    : supabase.from('destination_votes').insert({
        trip_id: parsed.tripId,
        poll_id: parsed.pollId,
        proposal_id: parsed.proposalId,
        user_id: parsed.userId,
      });

  const { data, error } = await query
    .select('id, trip_id, poll_id, proposal_id, user_id')
    .single<DestinationVoteRow>();

  if (error) {
    throw new Error(error.message);
  }

  await logNonBlocking(() =>
    logTripActivity({
      tripId: data.trip_id,
      eventType: 'destination_vote_submitted',
      metadata: {
        poll_id: data.poll_id,
        proposal_id: data.proposal_id,
        user_id: data.user_id,
      },
    }),
  );

  return mapDestinationVoteRow(data);
}

export async function getUserDestinationVote(
  pollId: string,
  userId: string,
): Promise<DestinationVote | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('destination_votes')
    .select('id, trip_id, poll_id, proposal_id, user_id')
    .eq('poll_id', pollId)
    .eq('user_id', userId)
    .maybeSingle<DestinationVoteRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapDestinationVoteRow(data) : null;
}

export async function listDestinationResults(pollId: string): Promise<DestinationPollResult[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('destination_poll_results')
    .select(resultSelect)
    .eq('poll_id', pollId)
    .order('rank', { ascending: true })
    .returns<DestinationPollResultRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapDestinationPollResultRow);
}

export async function computeDestinationResults(pollId: string): Promise<DestinationPollResult[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke<{ results: DestinationPollResultRow[] }>(
    'compute-destination-results',
    { body: { pollId } },
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data?.results ?? []).map(mapDestinationPollResultRow);
}

export async function closeDestinationPoll(
  values: CloseDestinationPollFormValues,
): Promise<{ tripId: string; winner: DestinationPollResult }> {
  const parsed = closeDestinationPollSchema.parse(values);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke<{
    tripId: string;
    winner: DestinationPollResultRow;
  }>('close-destination-poll', {
    body: parsed,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Close destination poll function returned no data.');
  }

  const proposal = await getDestinationProposal(data.winner.proposal_id);
  await logNonBlocking(() =>
    sendTripNotification({
      tripId: data.tripId,
      eventType: 'place_chosen',
      title: 'Place chosen',
      body: proposal?.title ?? 'The destination vote is closed.',
      metadata: {
        proposal_id: data.winner.proposal_id,
        result_id: data.winner.id,
      },
    }),
  );

  return {
    tripId: data.tripId,
    winner: mapDestinationPollResultRow(data.winner),
  };
}

export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  const parsed = fetchLinkMetadataSchema.parse({ url });
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke<LinkMetadata>('fetch-link-metadata', {
    body: parsed,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Metadata function returned no data.');
  }

  return data;
}

async function uploadProposalImage(input: {
  userId: string;
  tripId: string;
  proposalId: string;
  base64: string;
  contentType: string;
  fileExtension: string;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const extension = input.fileExtension.replace('.', '').toLowerCase() || 'jpg';
  const storagePath = `${input.tripId}/${input.proposalId}/${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from('proposal-images')
    .upload(storagePath, decode(input.base64), {
      contentType: input.contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: imageError } = await supabase.from('destination_proposal_images').insert({
    proposal_id: input.proposalId,
    created_by: input.userId,
    storage_path: storagePath,
    sort_order: 0,
  });

  if (imageError) {
    throw new Error(imageError.message);
  }
}

async function logNonBlocking(work: () => Promise<void>): Promise<void> {
  try {
    await work();
  } catch {
    // Activity and notifications should not undo the primary user action.
  }
}
