import { jsonResponse, optionsResponse } from '../_shared/cors.ts';
import {
  getInviteUnavailableStatus,
  hashInviteToken,
  inviteStatusMessage,
  InviteRow,
  InviteStatus,
} from '../_shared/invites.ts';
import { authenticateRequest, createServiceClient } from '../_shared/supabase.ts';

type AcceptInviteResult = {
  status: InviteStatus;
  tripId: string | null;
  message: string;
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
    const token = parseTokenBody(await request.json());
    const tokenHash = await hashInviteToken(token);

    const { data: invite, error: inviteError } = await serviceClient
      .from('trip_invites')
      .select('id, trip_id, created_by, token_hash, expires_at, max_uses, use_count, revoked_at, created_at, updated_at, deleted_at')
      .eq('token_hash', tokenHash)
      .maybeSingle<InviteRow>();

    if (inviteError) {
      throw new Error(inviteError.message);
    }

    if (!invite) {
      return inviteResult('invalid', null);
    }

    const unavailableStatus = getInviteUnavailableStatus(invite);

    if (unavailableStatus) {
      return inviteResult(unavailableStatus, invite.trip_id);
    }

    const { data: existingMember, error: memberLookupError } = await serviceClient
      .from('trip_members')
      .select('id')
      .eq('trip_id', invite.trip_id)
      .eq('user_id', userId)
      .eq('status', 'joined')
      .maybeSingle<{ id: string }>();

    if (memberLookupError) {
      throw new Error(memberLookupError.message);
    }

    if (existingMember) {
      return inviteResult('already_member', invite.trip_id);
    }

    const { data: updatedInvite, error: updateError } = await serviceClient
      .from('trip_invites')
      .update({ use_count: invite.use_count + 1 })
      .eq('id', invite.id)
      .eq('use_count', invite.use_count)
      .is('revoked_at', null)
      .select('id, trip_id, created_by, token_hash, expires_at, max_uses, use_count, revoked_at, created_at, updated_at, deleted_at')
      .maybeSingle<InviteRow>();

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (!updatedInvite) {
      return inviteResult('max_uses_reached', invite.trip_id);
    }

    const updatedUnavailableStatus = getInviteUnavailableStatus({
      ...updatedInvite,
      use_count: updatedInvite.use_count - 1,
    });

    if (updatedUnavailableStatus) {
      return inviteResult(updatedUnavailableStatus, invite.trip_id);
    }

    const { error: insertMemberError } = await serviceClient.from('trip_members').insert({
      trip_id: invite.trip_id,
      user_id: userId,
      role: 'member',
      status: 'joined',
      joined_at: new Date().toISOString(),
    });

    if (insertMemberError) {
      throw new Error(insertMemberError.message);
    }

    await serviceClient.from('activity_log').insert({
      trip_id: invite.trip_id,
      actor_user_id: userId,
      actor_type: 'user',
      event_type: 'member_joined',
      metadata: {
        invite_id: invite.id,
      },
    });

    return inviteResult('joined', invite.trip_id);
  } catch (error) {
    return jsonResponse(
      {
        status: 'invalid',
        tripId: null,
        message: error instanceof Error ? error.message : 'Invitation acceptance failed.',
      } satisfies AcceptInviteResult,
      400,
    );
  }
});

function inviteResult(status: InviteStatus, tripId: string | null): Response {
  return jsonResponse({
    status,
    tripId,
    message: inviteStatusMessage(status),
  } satisfies AcceptInviteResult);
}

function parseTokenBody(value: unknown): string {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid request body.');
  }

  const token = (value as Record<string, unknown>).token;

  if (typeof token !== 'string' || token.trim().length < 20) {
    throw new Error('Invalid invitation token.');
  }

  return token.trim();
}
