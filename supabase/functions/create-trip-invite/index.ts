import { jsonResponse, optionsResponse } from '../_shared/cors.ts';
import { generateInviteToken, hashInviteToken, InviteRow, toPublicInviteRow } from '../_shared/invites.ts';
import { authenticateRequest, createServiceClient } from '../_shared/supabase.ts';

type CreateInviteRequest = {
  tripId: string;
  expiresAt: string | null;
  maxUses: number | null;
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
    const body = parseCreateInviteBody(await request.json());

    const { data: canManage, error: manageError } = await serviceClient.rpc('can_manage_trip', {
      target_trip_id: body.tripId,
      target_user_id: userId,
    });

    if (manageError) {
      throw new Error(manageError.message);
    }

    if (canManage !== true) {
      return jsonResponse({ error: 'Only trip owners and admins can create invite links.' }, 403);
    }

    const token = generateInviteToken();
    const tokenHash = await hashInviteToken(token);

    const { data: invite, error: inviteError } = await serviceClient
      .from('trip_invites')
      .insert({
        trip_id: body.tripId,
        created_by: userId,
        token_hash: tokenHash,
        expires_at: body.expiresAt,
        max_uses: body.maxUses,
      })
      .select('id, trip_id, created_by, token_hash, expires_at, max_uses, use_count, revoked_at, created_at, updated_at, deleted_at')
      .single<InviteRow>();

    if (inviteError) {
      throw new Error(inviteError.message);
    }

    await serviceClient.from('activity_log').insert({
      trip_id: body.tripId,
      actor_user_id: userId,
      actor_type: 'user',
      event_type: 'trip_invite_created',
      metadata: {
        invite_id: invite.id,
        expires_at: body.expiresAt,
        max_uses: body.maxUses,
      },
    });

    return jsonResponse({
      invite: toPublicInviteRow(invite),
      token,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Invite creation failed.' }, 400);
  }
});

function parseCreateInviteBody(value: unknown): CreateInviteRequest {
  if (!isRecord(value)) {
    throw new Error('Invalid request body.');
  }

  const tripId = readString(value, 'tripId');
  const expiresAt = readNullableString(value, 'expiresAt');
  const maxUses = readNullableInteger(value, 'maxUses');

  if (!tripId) {
    throw new Error('Trip id is required.');
  }

  if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) {
    throw new Error('Expiration must be a valid timestamp.');
  }

  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    throw new Error('Expiration must be in the future.');
  }

  if (maxUses !== null && maxUses <= 0) {
    throw new Error('Maximum uses must be greater than zero.');
  }

  return {
    tripId,
    expiresAt,
    maxUses,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];

  return typeof value === 'string' ? value.trim() : '';
}

function readNullableString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];

  if (value === null || value === undefined || value === '') {
    return null;
  }

  return typeof value === 'string' ? value.trim() : null;
}

function readNullableInteger(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];

  if (value === null || value === undefined || value === '') {
    return null;
  }

  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}
