import { jsonResponse, optionsResponse } from '../_shared/cors.ts';
import {
  computeAndPersistDatePollResults,
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
      return jsonResponse({ error: 'Only trip owners and admins can compute date poll results.' }, 403);
    }

    if (poll.status === 'closed') {
      return jsonResponse({ error: 'Closed date polls cannot be recomputed.' }, 400);
    }

    const results = await computeAndPersistDatePollResults(serviceClient, poll);

    return jsonResponse({ results });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Date poll result computation failed.' },
      400,
    );
  }
});

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
