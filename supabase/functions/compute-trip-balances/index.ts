import { jsonResponse, optionsResponse } from '../_shared/cors.ts';
import { computeAndPersistTripBalances } from '../_shared/expenseBalances.ts';
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
    const tripId = parseTripId(await request.json());

    const { data: isMember, error: memberError } = await serviceClient.rpc('is_trip_member', {
      target_trip_id: tripId,
      target_user_id: userId,
    });

    if (memberError) {
      throw new Error(memberError.message);
    }

    if (isMember !== true) {
      return jsonResponse({ error: 'Only trip members can compute balances.' }, 403);
    }

    const result = await computeAndPersistTripBalances(serviceClient, tripId);

    await serviceClient.from('activity_log').insert({
      trip_id: tripId,
      actor_user_id: userId,
      actor_type: 'user',
      event_type: 'trip_balances_computed',
      metadata: {
        balance_count: result.balances.length,
        settlement_count: result.settlements.length,
      },
    });

    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Balance computation failed.' }, 400);
  }
});

function parseTripId(value: unknown): string {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid request body.');
  }

  const tripId = (value as Record<string, unknown>).tripId;

  if (typeof tripId !== 'string' || tripId.trim().length === 0) {
    throw new Error('Trip id is required.');
  }

  return tripId.trim();
}
