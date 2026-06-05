import { getSupabaseClient } from '../lib/supabase/client';
import { logTripActivity, sendTripNotification } from './notificationService';
import { DatePollSetupFormValues, DatePollVoteFormValues, datePollSetupSchema, datePollVoteSchema } from '../lib/validation/datePoll';
import {
  DateAvailabilityVote,
  DateAvailabilityVoteRow,
  DatePoll,
  DatePollAllowedRange,
  DatePollAllowedRangeRow,
  DatePollBundle,
  DatePollRequiredMemberRow,
  DatePollResult,
  DatePollResultRow,
  DatePollRow,
  DatePollVoteByDate,
  mapDateAvailabilityVoteRow,
  mapDatePollAllowedRangeRow,
  mapDatePollRequiredMemberRow,
  mapDatePollResultRow,
  mapDatePollRow,
} from '../types/datePoll';

const pollSelect =
  'id, trip_id, status, starts_on, ends_on, min_trip_days, max_trip_days, preferred_duration_days, voting_deadline_at, created_by, closed_at, created_at';

const resultSelect =
  'id, poll_id, starts_on, ends_on, available_member_count, total_member_count, available_percentage, duration_days, preferred_duration_delta, score, rank, is_winner, preferred_member_count, maybe_member_count, unavailable_member_count, pending_member_count, required_members_missing_count, rank_reason, computed_at';

export async function getLatestDatePollBundle(tripId: string): Promise<DatePollBundle> {
  const supabase = getSupabaseClient();
  const { data: pollRow, error: pollError } = await supabase
    .from('polls')
    .select(pollSelect)
    .eq('trip_id', tripId)
    .eq('type', 'date')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<DatePollRow>();

  if (pollError) {
    throw new Error(pollError.message);
  }

  if (!pollRow) {
    return {
      poll: null,
      allowedRanges: [],
      requiredMemberIds: [],
    };
  }

  const [allowedRanges, requiredMembers] = await Promise.all([
    listAllowedRanges(pollRow.id),
    listRequiredMembers(pollRow.id),
  ]);

  return {
    poll: mapDatePollRow(pollRow),
    allowedRanges,
    requiredMemberIds: requiredMembers.map((member) => member.userId),
  };
}

export async function createDatePoll(userId: string, values: DatePollSetupFormValues): Promise<DatePoll> {
  const parsed = datePollSetupSchema.parse(values);
  const supabase = getSupabaseClient();

  const { data: pollRow, error: pollError } = await supabase
    .from('polls')
    .insert({
      trip_id: parsed.tripId,
      type: 'date',
      status: 'active',
      starts_on: parsed.allowedStartDate,
      ends_on: parsed.allowedEndDate,
      min_trip_days: parsed.minTripDays,
      max_trip_days: parsed.maxTripDays,
      preferred_duration_days: parsed.preferredDurationDays,
      voting_deadline_at: parsed.votingDeadlineAt,
      created_by: userId,
    })
    .select(pollSelect)
    .single<DatePollRow>();

  if (pollError) {
    throw new Error(pollError.message);
  }

  const { error: rangeError } = await supabase.from('date_poll_allowed_ranges').insert({
    poll_id: pollRow.id,
    starts_on: parsed.allowedStartDate,
    ends_on: parsed.allowedEndDate,
  });

  if (rangeError) {
    throw new Error(rangeError.message);
  }

  if (parsed.requiredMemberIds.length > 0) {
    const { error: requiredError } = await supabase.from('date_poll_required_members').insert(
      parsed.requiredMemberIds.map((requiredUserId) => ({
        poll_id: pollRow.id,
        user_id: requiredUserId,
      })),
    );

    if (requiredError) {
      throw new Error(requiredError.message);
    }
  }

  const { error: tripError } = await supabase
    .from('trips')
    .update({ status: 'voting_dates' })
    .eq('id', parsed.tripId);

  if (tripError) {
    throw new Error(tripError.message);
  }

  await logNonBlocking(() =>
    logTripActivity({
      tripId: parsed.tripId,
      eventType: 'date_poll_created',
      metadata: {
        poll_id: pollRow.id,
        starts_on: parsed.allowedStartDate,
        ends_on: parsed.allowedEndDate,
      },
    }),
  );

  return mapDatePollRow(pollRow);
}

export async function getUserDatePollVotes(
  pollId: string,
  userId: string,
): Promise<DatePollVoteByDate> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('date_availability_votes')
    .select('id, poll_id, user_id, available_on, status')
    .eq('poll_id', pollId)
    .eq('user_id', userId)
    .returns<DateAvailabilityVoteRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).reduce<DatePollVoteByDate>((votesByDate, row) => {
    const vote = mapDateAvailabilityVoteRow(row);
    votesByDate[vote.date] = vote.status;
    return votesByDate;
  }, {});
}

export async function listDatePollVotes(pollId: string): Promise<DateAvailabilityVote[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('date_availability_votes')
    .select('id, poll_id, user_id, available_on, status')
    .eq('poll_id', pollId)
    .returns<DateAvailabilityVoteRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapDateAvailabilityVoteRow);
}

export async function saveDatePollVotes(values: DatePollVoteFormValues): Promise<DateAvailabilityVote[]> {
  const parsed = datePollVoteSchema.parse(values);
  const supabase = getSupabaseClient();
  const rows = Object.entries(parsed.votes).map(([date, status]) => ({
    poll_id: parsed.pollId,
    user_id: parsed.userId,
    available_on: date,
    status,
  }));

  const { error: deleteError } = await supabase
    .from('date_availability_votes')
    .delete()
    .eq('poll_id', parsed.pollId)
    .eq('user_id', parsed.userId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (rows.length === 0) {
    await logDateVoteSubmitted(parsed.pollId, parsed.userId, 0);
    return [];
  }

  const { data, error } = await supabase
    .from('date_availability_votes')
    .insert(rows)
    .select('id, poll_id, user_id, available_on, status')
    .returns<DateAvailabilityVoteRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  await logDateVoteSubmitted(parsed.pollId, parsed.userId, rows.length);

  return (data ?? []).map(mapDateAvailabilityVoteRow);
}

export async function listDatePollResults(pollId: string): Promise<DatePollResult[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('date_poll_results')
    .select(resultSelect)
    .eq('poll_id', pollId)
    .order('rank', { ascending: true })
    .returns<DatePollResultRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapDatePollResultRow);
}

export async function computeDatePollResults(pollId: string): Promise<DatePollResult[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke<{ results: DatePollResultRow[] }>(
    'compute-date-poll-results',
    {
      body: { pollId },
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data?.results ?? []).map(mapDatePollResultRow);
}

export async function closeDatePoll(pollId: string): Promise<{ tripId: string; winner: DatePollResult }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke<{
    tripId: string;
    winner: DatePollResultRow;
  }>('close-date-poll', {
    body: { pollId },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Close date poll function returned no data.');
  }

  await logNonBlocking(() =>
    sendTripNotification({
      tripId: data.tripId,
      eventType: 'date_chosen',
      title: 'Date chosen',
      body: `The trip dates are ${data.winner.starts_on} to ${data.winner.ends_on}.`,
      metadata: {
        result_id: data.winner.id,
        starts_on: data.winner.starts_on,
        ends_on: data.winner.ends_on,
      },
    }),
  );

  return {
    tripId: data.tripId,
    winner: mapDatePollResultRow(data.winner),
  };
}

async function logDateVoteSubmitted(pollId: string, userId: string, voteCount: number): Promise<void> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('polls')
    .select('trip_id')
    .eq('id', pollId)
    .maybeSingle<{ trip_id: string }>();

  if (error || !data) {
    return;
  }

  await logNonBlocking(() =>
    logTripActivity({
      tripId: data.trip_id,
      eventType: 'date_vote_submitted',
      metadata: {
        poll_id: pollId,
        user_id: userId,
        vote_count: voteCount,
      },
    }),
  );
}

async function logNonBlocking(work: () => Promise<void>): Promise<void> {
  try {
    await work();
  } catch {
    // Activity and notifications should not undo the primary user action.
  }
}

async function listAllowedRanges(pollId: string): Promise<DatePollAllowedRange[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('date_poll_allowed_ranges')
    .select('id, poll_id, starts_on, ends_on')
    .eq('poll_id', pollId)
    .order('starts_on', { ascending: true })
    .returns<DatePollAllowedRangeRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapDatePollAllowedRangeRow);
}

async function listRequiredMembers(pollId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('date_poll_required_members')
    .select('id, poll_id, user_id')
    .eq('poll_id', pollId)
    .returns<DatePollRequiredMemberRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapDatePollRequiredMemberRow);
}
