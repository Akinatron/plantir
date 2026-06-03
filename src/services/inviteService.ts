import * as Linking from 'expo-linking';

import { getSupabaseClient } from '../lib/supabase/client';
import { CreateInviteFormValues } from '../lib/validation/trip';
import { TripInvite, TripInviteRow, mapTripInviteRow } from '../types/trip';

export type CreatedInvite = {
  invite: TripInvite;
  token: string;
  url: string;
};

export type AcceptInviteStatus =
  | 'joined'
  | 'already_member'
  | 'invalid'
  | 'expired'
  | 'revoked'
  | 'max_uses_reached'
  | 'pending_approval';

export type AcceptInviteResult = {
  status: AcceptInviteStatus;
  tripId: string | null;
  message: string;
};

export async function listTripInvites(tripId: string): Promise<TripInvite[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('trip_invites')
    .select('id, trip_id, expires_at, max_uses, use_count, revoked_at, created_at')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .returns<TripInviteRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapTripInviteRow);
}

export async function createTripInvite(values: CreateInviteFormValues): Promise<CreatedInvite> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke<{
    invite: TripInviteRow;
    token: string;
  }>('create-trip-invite', {
    body: {
      tripId: values.tripId,
      expiresAt: values.expiresAt,
      maxUses: values.maxUses,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Invite function returned no data.');
  }

  return {
    invite: mapTripInviteRow(data.invite),
    token: data.token,
    url: Linking.createURL(`/invite/${data.token}`),
  };
}

export async function revokeTripInvite(inviteId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('trip_invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', inviteId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function acceptTripInvite(token: string): Promise<AcceptInviteResult> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke<AcceptInviteResult>('accept-trip-invite', {
    body: { token },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Invite function returned no data.');
  }

  return data;
}
