import { jsonResponse, optionsResponse } from '../_shared/cors.ts';
import {
  computeAndPersistDestinationResults,
  DestinationResultRow,
  fetchDestinationPoll,
  fetchProposal,
} from '../_shared/destinationResults.ts';
import { authenticateRequest, createServiceClient } from '../_shared/supabase.ts';

type CloseBody = {
  pollId: string;
  selectedProposalId: string | null;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse();
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const serviceClient = createServiceClient();
    const { userId } = await authenticateRequest(request, serviceClient);
    const body = parseBody(await request.json());
    const poll = await fetchDestinationPoll(serviceClient, body.pollId);

    const { data: canManage, error: manageError } = await serviceClient.rpc('can_manage_trip', {
      target_trip_id: poll.trip_id,
      target_user_id: userId,
    });

    if (manageError) {
      throw new Error(manageError.message);
    }

    if (canManage !== true) {
      return jsonResponse({ error: 'Only trip owners and admins can close destination polls.' }, 403);
    }

    if (poll.status === 'closed') {
      return jsonResponse({ error: 'Destination poll is already closed.' }, 400);
    }

    const results = await computeAndPersistDestinationResults(serviceClient, poll);
    const tiedWinners = results.filter((result) => result.is_tied_winner);
    const winner = selectWinner(results, tiedWinners, body.selectedProposalId);
    const proposal = await fetchProposal(serviceClient, winner.proposal_id);

    if (proposal.poll_id !== poll.id || proposal.trip_id !== poll.trip_id) {
      throw new Error('Selected proposal does not belong to this destination poll.');
    }

    await closePollAndTrip(serviceClient, poll.id, poll.trip_id, winner, proposal, userId);

    return jsonResponse({
      tripId: poll.trip_id,
      winner,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Destination poll close failed.' }, 400);
  }
});

function selectWinner(
  results: DestinationResultRow[],
  tiedWinners: DestinationResultRow[],
  selectedProposalId: string | null,
): DestinationResultRow {
  if (tiedWinners.length > 0) {
    if (!selectedProposalId) {
      throw new Error('Tie detected. Owner/admin must choose one tied proposal.');
    }

    const selected = tiedWinners.find((result) => result.proposal_id === selectedProposalId);

    if (!selected) {
      throw new Error('Selected proposal must be one of the tied winners.');
    }

    return selected;
  }

  const winner = results.find((result) => result.is_winner) ?? results[0];

  if (!winner) {
    throw new Error('No winning proposal was computed.');
  }

  return winner;
}

async function closePollAndTrip(
  serviceClient: ReturnType<typeof createServiceClient>,
  pollId: string,
  tripId: string,
  winner: DestinationResultRow,
  proposal: Awaited<ReturnType<typeof fetchProposal>>,
  userId: string,
): Promise<void> {
  const closedAt = new Date().toISOString();
  const snapshot = {
    id: proposal.id,
    title: proposal.title,
    description: proposal.description,
    url: proposal.url,
    location_name: proposal.location_text,
    total_price_cents: proposal.estimated_price_cents,
    currency_code: proposal.currency_code,
    price_per_person_cents: proposal.price_per_person_cents,
    capacity: proposal.capacity,
    bedrooms: proposal.bedrooms,
    bathrooms: proposal.bathrooms,
    pros: proposal.pros,
    cons: proposal.cons,
    selected_result_id: winner.id,
    selected_at: closedAt,
  };

  const { error: resultError } = await serviceClient
    .from('destination_poll_results')
    .update({
      is_winner: false,
      is_tied_winner: false,
    })
    .eq('poll_id', pollId);

  if (resultError) {
    throw new Error(resultError.message);
  }

  const { error: winnerError } = await serviceClient
    .from('destination_poll_results')
    .update({ is_winner: true, is_tied_winner: false })
    .eq('id', winner.id);

  if (winnerError) {
    throw new Error(winnerError.message);
  }

  const { error: proposalError } = await serviceClient
    .from('destination_proposals')
    .update({ selected_at: closedAt })
    .eq('id', proposal.id);

  if (proposalError) {
    throw new Error(proposalError.message);
  }

  const { error: pollError } = await serviceClient
    .from('polls')
    .update({ status: 'closed', closed_at: closedAt })
    .eq('id', pollId);

  if (pollError) {
    throw new Error(pollError.message);
  }

  const { error: tripError } = await serviceClient
    .from('trips')
    .update({
      status: 'place_decided',
      final_destination_proposal_id: proposal.id,
      selected_destination_proposal_id: proposal.id,
      selected_destination_snapshot: snapshot,
    })
    .eq('id', tripId);

  if (tripError) {
    throw new Error(tripError.message);
  }

  const { error: activityError } = await serviceClient.from('activity_log').insert({
    trip_id: tripId,
    actor_user_id: userId,
    actor_type: 'user',
    event_type: 'destination_poll_closed',
    metadata: {
      poll_id: pollId,
      proposal_id: proposal.id,
      result_id: winner.id,
      title: proposal.title,
    },
  });

  if (activityError) {
    throw new Error(activityError.message);
  }
}

function parseBody(value: unknown): CloseBody {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid request body.');
  }

  const record = value as Record<string, unknown>;
  const pollId = record.pollId;
  const selectedProposalId = record.selectedProposalId;

  if (typeof pollId !== 'string' || pollId.trim().length === 0) {
    throw new Error('Poll id is required.');
  }

  if (selectedProposalId !== null && selectedProposalId !== undefined && typeof selectedProposalId !== 'string') {
    throw new Error('Selected proposal id must be a string or null.');
  }

  return {
    pollId: pollId.trim(),
    selectedProposalId: typeof selectedProposalId === 'string' ? selectedProposalId.trim() : null,
  };
}
