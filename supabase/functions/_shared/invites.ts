export type InviteStatus =
  | 'joined'
  | 'already_member'
  | 'invalid'
  | 'expired'
  | 'revoked'
  | 'max_uses_reached'
  | 'pending_approval';

export type InviteRow = {
  id: string;
  trip_id: string;
  created_by: string;
  token_hash: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PublicInviteRow = {
  id: string;
  trip_id: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  revoked_at: string | null;
  created_at: string;
};

const TOKEN_BYTES = 32;

export function generateInviteToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);

  return base64UrlEncode(bytes);
}

export async function hashInviteToken(token: string): Promise<string> {
  const trimmedToken = token.trim();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(trimmedToken));

  return base64UrlEncode(new Uint8Array(digest));
}

export function toPublicInviteRow(row: InviteRow): PublicInviteRow {
  return {
    id: row.id,
    trip_id: row.trip_id,
    expires_at: row.expires_at,
    max_uses: row.max_uses,
    use_count: row.use_count,
    revoked_at: row.revoked_at,
    created_at: row.created_at,
  };
}

export function getInviteUnavailableStatus(invite: InviteRow, now = new Date()): InviteStatus | null {
  if (invite.deleted_at) {
    return 'invalid';
  }

  if (invite.revoked_at) {
    return 'revoked';
  }

  if (invite.expires_at && new Date(invite.expires_at).getTime() <= now.getTime()) {
    return 'expired';
  }

  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
    return 'max_uses_reached';
  }

  return null;
}

export function inviteStatusMessage(status: InviteStatus): string {
  if (status === 'joined') {
    return 'You joined the trip.';
  }

  if (status === 'already_member') {
    return 'You are already a member of this trip.';
  }

  if (status === 'invalid') {
    return 'This invitation is invalid.';
  }

  if (status === 'expired') {
    return 'This invitation has expired.';
  }

  if (status === 'revoked') {
    return 'This invitation was revoked by the trip owner or admin.';
  }

  if (status === 'max_uses_reached') {
    return 'This invitation has reached its maximum number of uses.';
  }

  return 'Your request is pending approval.';
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
