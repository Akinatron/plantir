import { jsonResponse, optionsResponse } from '../_shared/cors.ts';
import { computeAndPersistTripBalances } from '../_shared/expenseBalances.ts';
import { authenticateRequest, createServiceClient } from '../_shared/supabase.ts';

type SuggestionRow = {
  id: string;
  trip_id: string;
  from_user_id: string;
  to_user_id: string;
  amount_cents: number;
  currency_code: string;
};

type PaymentRow = {
  id: string;
  trip_id: string;
  suggestion_id: string | null;
  from_user_id: string;
  to_user_id: string;
  amount_cents: number;
  currency_code: string;
  status: 'pending' | 'paid' | 'cancelled';
  marked_paid_by: string | null;
  paid_at: string | null;
};

type TripPaymentPolicyRow = {
  status: string;
  closed_at: string | null;
  settlement_mark_paid_policy: 'owner_admin_only' | 'participants';
};

const paymentSelect =
  'id, trip_id, suggestion_id, from_user_id, to_user_id, amount_cents, currency_code, status, marked_paid_by, paid_at';

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
    const suggestionId = parseSuggestionId(await request.json());
    const suggestion = await fetchSuggestion(serviceClient, suggestionId);

    const { data: isMember, error: memberError } = await serviceClient.rpc('is_trip_member', {
      target_trip_id: suggestion.trip_id,
      target_user_id: userId,
    });

    if (memberError) {
      throw new Error(memberError.message);
    }

    if (isMember !== true) {
      return jsonResponse({ error: 'Only trip members can mark settlement payments.' }, 403);
    }

    const [tripPolicy, isAdmin] = await Promise.all([
      fetchTripPaymentPolicy(serviceClient, suggestion.trip_id),
      checkTripAdmin(serviceClient, suggestion.trip_id, userId),
    ]);

    if (tripPolicy.status === 'closed' || tripPolicy.closed_at !== null) {
      return jsonResponse({ error: 'Closed trips are read-only.' }, 403);
    }

    if (tripPolicy.settlement_mark_paid_policy === 'owner_admin_only' && isAdmin !== true) {
      return jsonResponse({ error: 'Only trip admins can mark settlements paid.' }, 403);
    }

    if (
      tripPolicy.settlement_mark_paid_policy === 'participants'
      && isAdmin !== true
      && userId !== suggestion.from_user_id
      && userId !== suggestion.to_user_id
    ) {
      return jsonResponse({ error: 'Only settlement participants or admins can mark this paid.' }, 403);
    }

    const payment = await createPaidPayment(serviceClient, suggestion, userId);
    await computeAndPersistTripBalances(serviceClient, suggestion.trip_id);

    await serviceClient.from('activity_log').insert({
      trip_id: suggestion.trip_id,
      actor_user_id: userId,
      actor_type: 'user',
      event_type: 'settlement_marked_paid',
      metadata: {
        payment_id: payment.id,
        suggestion_id: suggestion.id,
        from_user_id: suggestion.from_user_id,
        to_user_id: suggestion.to_user_id,
        amount_cents: suggestion.amount_cents,
        currency_code: suggestion.currency_code,
      },
    });

    return jsonResponse({ payment });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Mark settlement paid failed.' }, 400);
  }
});

async function fetchSuggestion(serviceClient: ReturnType<typeof createServiceClient>, suggestionId: string): Promise<SuggestionRow> {
  const { data, error } = await serviceClient
    .from('settlement_suggestions')
    .select('id, trip_id, from_user_id, to_user_id, amount_cents, currency_code')
    .eq('id', suggestionId)
    .maybeSingle<SuggestionRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Settlement suggestion not found.');
  }

  return data;
}

async function fetchTripPaymentPolicy(
  serviceClient: ReturnType<typeof createServiceClient>,
  tripId: string,
): Promise<TripPaymentPolicyRow> {
  const { data, error } = await serviceClient
    .from('trips')
    .select('status, closed_at, settlement_mark_paid_policy')
    .eq('id', tripId)
    .maybeSingle<TripPaymentPolicyRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Trip not found.');
  }

  return data;
}

async function checkTripAdmin(
  serviceClient: ReturnType<typeof createServiceClient>,
  tripId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await serviceClient.rpc('is_trip_admin', {
    target_trip_id: tripId,
    target_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data === true;
}

async function createPaidPayment(
  serviceClient: ReturnType<typeof createServiceClient>,
  suggestion: SuggestionRow,
  userId: string,
): Promise<PaymentRow> {
  const now = new Date().toISOString();
  const { data, error } = await serviceClient
    .from('settlement_payments')
    .insert({
      trip_id: suggestion.trip_id,
      suggestion_id: suggestion.id,
      from_user_id: suggestion.from_user_id,
      to_user_id: suggestion.to_user_id,
      amount_cents: suggestion.amount_cents,
      currency_code: suggestion.currency_code,
      status: 'paid',
      marked_paid_by: userId,
      paid_at: now,
    })
    .select(paymentSelect)
    .single<PaymentRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

function parseSuggestionId(value: unknown): string {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid request body.');
  }

  const suggestionId = (value as Record<string, unknown>).suggestionId;

  if (typeof suggestionId !== 'string' || suggestionId.trim().length === 0) {
    throw new Error('Suggestion id is required.');
  }

  return suggestionId.trim();
}
