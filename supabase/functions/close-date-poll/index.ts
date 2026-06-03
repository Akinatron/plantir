import { jsonResponse, optionsResponse } from '../_shared/cors.ts';
import {
  computeAndPersistDatePollResults,
  DatePollResultRow,
  fetchDatePoll,
} from '../_shared/datePollResults.ts';
import { authenticateRequest, createServiceClient } from '../_shared/supabase.ts';

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
    const pollId = parsePollId(await request.json());
    const poll = await fetchDatePoll(serviceClient, pollId);

    const { data: canManage, error: manageError } = await serviceClient.rpc('can_manage_trip', {
      target_trip_id: poll.trip_id,
      target_user_id: userId,
    });

    if (manageError) {
      throw new Error(manageError.message);
    }

    if (canManage !== true) {
      return jsonResponse({ error: 'Only trip owners and admins can close date polls.' }, 403);
    }

    if (poll.status === 'closed') {
      return jsonResponse({ error: 'Date poll is already closed.' }, 400);
    }

    const results = await computeAndPersistDatePollResults(serviceClient, poll);
    const winner = results.find((result) => result.is_winner) ?? results[0];

    if (!winner) {
      throw new Error('No winning date range was computed.');
    }

    await closePollAndTrip(serviceClient, poll.id, poll.trip_id, winner, userId);

    return jsonResponse({
      tripId: poll.trip_id,
      winner,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Date poll close failed.' }, 400);
  }
});

async function closePollAndTrip(
  serviceClient: ReturnType<typeof createServiceClient>,
  pollId: string,
  tripId: string,
  winner: DatePollResultRow,
  userId: string,
): Promise<void> {
  const closedAt = new Date().toISOString();

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
      status: 'date_decided',
      starts_on: winner.starts_on,
      ends_on: winner.ends_on,
      final_date_poll_result_id: winner.id,
    })
    .eq('id', tripId);

  if (tripError) {
    throw new Error(tripError.message);
  }

  const { error: activityError } = await serviceClient.from('activity_log').insert({
    trip_id: tripId,
    actor_user_id: userId,
    actor_type: 'user',
    event_type: 'date_poll_closed',
    metadata: {
      poll_id: pollId,
      result_id: winner.id,
      starts_on: winner.starts_on,
      ends_on: winner.ends_on,
    },
  });

  if (activityError) {
    throw new Error(activityError.message);
  }
}

function parsePollId(value: unknown): string {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid request body.');
  }

  const pollId = (value as Record<string, unknown>).pollId;

  if (typeof pollId !== 'string' || pollId.trim().length === 0) {
    throw new Error('Poll id is required.');
  }

  return pollId.trim();
}
