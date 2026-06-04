import { jsonResponse, optionsResponse } from '../_shared/cors.ts';
import { authenticateRequest, createServiceClient } from '../_shared/supabase.ts';

const allowedEvents = new Set([
  'trip_created',
  'member_joined',
  'date_poll_created',
  'date_vote_submitted',
  'date_chosen',
  'destination_proposal_created',
  'destination_vote_submitted',
  'destination_chosen',
  'expense_created',
  'settlement_marked_paid',
  'task_created',
  'task_completed',
]);

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
    const input = parseBody(await request.json());

    const { data: isMember, error: memberError } = await serviceClient.rpc('is_trip_member', {
      target_trip_id: input.tripId,
      target_user_id: userId,
    });

    if (memberError) {
      throw new Error(memberError.message);
    }

    if (isMember !== true) {
      return jsonResponse({ error: 'Only trip members can log activity.' }, 403);
    }

    const { error } = await serviceClient.from('activity_log').insert({
      trip_id: input.tripId,
      actor_user_id: userId,
      actor_type: 'user',
      event_type: input.eventType,
      metadata: input.metadata,
    });

    if (error) {
      throw new Error(error.message);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Activity logging failed.' }, 400);
  }
});

function parseBody(value: unknown): {
  tripId: string;
  eventType: string;
  metadata: Record<string, unknown>;
} {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid request body.');
  }

  const record = value as Record<string, unknown>;
  const tripId = readRequiredString(record.tripId, 'Trip id');
  const eventType = readRequiredString(record.eventType, 'Event type');

  if (!allowedEvents.has(eventType)) {
    throw new Error('Unsupported activity event type.');
  }

  const metadata = record.metadata;

  if (metadata !== undefined && (!isPlainObject(metadata) || Array.isArray(metadata))) {
    throw new Error('Metadata must be an object.');
  }

  return {
    tripId,
    eventType,
    metadata: metadata === undefined ? {} : metadata as Record<string, unknown>,
  };
}

function readRequiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
