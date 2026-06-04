import { jsonResponse, optionsResponse } from '../_shared/cors.ts';
import { authenticateRequest, createServiceClient } from '../_shared/supabase.ts';

const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
const notifyEvents = new Set([
  'invited_to_trip',
  'member_joined',
  'date_chosen',
  'new_proposal',
  'place_chosen',
  'new_expense',
  'settlement_marked_paid',
  'task_assigned',
]);

type TripMemberRow = {
  user_id: string;
};

type PreferenceRow = {
  user_id: string;
  in_app_enabled: boolean;
  push_enabled: boolean;
  muted_event_types: string[];
};

type PushTokenRow = {
  user_id: string;
  token: string;
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
    const input = parseBody(await request.json());

    const { data: isMember, error: memberError } = await serviceClient.rpc('is_trip_member', {
      target_trip_id: input.tripId,
      target_user_id: userId,
    });

    if (memberError) {
      throw new Error(memberError.message);
    }

    if (isMember !== true) {
      return jsonResponse({ error: 'Only trip members can notify this trip.' }, 403);
    }

    const recipients = await resolveRecipients(serviceClient, input.tripId, userId, input.targetUserIds);

    if (recipients.length === 0) {
      return jsonResponse({ inserted: 0, pushAttempted: 0 });
    }

    const preferences = await fetchPreferences(serviceClient, recipients);
    const eligibleForInApp = recipients.filter((recipientUserId) => {
      const preference = preferences.get(recipientUserId);
      return preferenceAllows(preference, 'in_app_enabled', input.eventType);
    });
    const eligibleForPush = recipients.filter((recipientUserId) => {
      const preference = preferences.get(recipientUserId);
      return preferenceAllows(preference, 'push_enabled', input.eventType);
    });

    if (eligibleForInApp.length > 0) {
      const { error: insertError } = await serviceClient.from('notifications').insert(
        eligibleForInApp.map((recipientUserId) => ({
          user_id: recipientUserId,
          trip_id: input.tripId,
          title: input.title,
          body: input.body,
          status: 'pending',
          metadata: {
            ...input.metadata,
            event_type: input.eventType,
          },
        })),
      );

      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    const pushAttempted = await sendPushNotifications(
      serviceClient,
      eligibleForPush,
      input.title,
      input.body,
      {
        ...input.metadata,
        event_type: input.eventType,
        trip_id: input.tripId,
      },
    );

    return jsonResponse({
      inserted: eligibleForInApp.length,
      pushAttempted,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Notification send failed.' }, 400);
  }
});

async function resolveRecipients(
  serviceClient: ReturnType<typeof createServiceClient>,
  tripId: string,
  actorUserId: string,
  targetUserIds: string[] | null,
): Promise<string[]> {
  const { data, error } = await serviceClient
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId)
    .eq('status', 'joined')
    .returns<TripMemberRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const memberIds = new Set((data ?? []).map((member) => member.user_id));
  const requestedTargets = targetUserIds?.length ? targetUserIds : Array.from(memberIds);

  return [...new Set(requestedTargets)]
    .filter((targetUserId) => memberIds.has(targetUserId))
    .filter((targetUserId) => targetUserId !== actorUserId);
}

async function fetchPreferences(
  serviceClient: ReturnType<typeof createServiceClient>,
  userIds: string[],
): Promise<Map<string, PreferenceRow>> {
  const { data, error } = await serviceClient
    .from('notification_preferences')
    .select('user_id, in_app_enabled, push_enabled, muted_event_types')
    .in('user_id', userIds)
    .returns<PreferenceRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((preference) => [preference.user_id, preference]));
}

function preferenceAllows(
  preference: PreferenceRow | undefined,
  channel: 'in_app_enabled' | 'push_enabled',
  eventType: string,
): boolean {
  if (!preference) {
    return true;
  }

  return preference[channel] && !preference.muted_event_types.includes(eventType);
}

async function sendPushNotifications(
  serviceClient: ReturnType<typeof createServiceClient>,
  userIds: string[],
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<number> {
  if (userIds.length === 0) {
    return 0;
  }

  const { data: tokens, error } = await serviceClient
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', userIds)
    .is('revoked_at', null)
    .returns<PushTokenRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const messages = (tokens ?? [])
    .filter((row) => row.token.startsWith('ExponentPushToken[') || row.token.startsWith('ExpoPushToken['))
    .map((row) => ({
      to: row.token,
      sound: 'default',
      title,
      body,
      data,
    }));

  if (messages.length === 0) {
    return 0;
  }

  await fetch(expoPushUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  return messages.length;
}

function parseBody(value: unknown): {
  tripId: string;
  eventType: string;
  title: string;
  body: string;
  targetUserIds: string[] | null;
  metadata: Record<string, unknown>;
} {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid request body.');
  }

  const record = value as Record<string, unknown>;
  const eventType = readRequiredString(record.eventType, 'Event type');

  if (!notifyEvents.has(eventType)) {
    throw new Error('Unsupported notification event type.');
  }

  const metadata = record.metadata;

  if (metadata !== undefined && !isPlainObject(metadata)) {
    throw new Error('Metadata must be an object.');
  }

  const targetUserIds = record.targetUserIds;

  if (targetUserIds !== undefined && !isStringArray(targetUserIds)) {
    throw new Error('Target user ids must be strings.');
  }

  return {
    tripId: readRequiredString(record.tripId, 'Trip id'),
    eventType,
    title: readRequiredString(record.title, 'Title'),
    body: readRequiredString(record.body, 'Body'),
    targetUserIds: targetUserIds === undefined ? null : targetUserIds,
    metadata: metadata === undefined ? {} : metadata,
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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim().length > 0);
}
