import { getSupabaseClient } from '../lib/supabase/client';
import { logTripActivity } from './notificationService';
import { CreateTripFormValues, TripSettingsFormValues } from '../lib/validation/trip';
import { Trip, TripMember, TripMemberRow, TripRow, mapTripMemberRow, mapTripRow } from '../types/trip';

const tripSelect =
  'id, owner_id, title, description, timezone, status, starts_on, ends_on, member_can_create_proposals, member_can_create_expenses, closed_at, created_at, updated_at';

export async function listTripsForUser(userId: string): Promise<Trip[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('trip_members')
    .select(`trips!inner(${tripSelect})`)
    .eq('user_id', userId)
    .eq('status', 'joined')
    .returns<{ trips: TripRow }[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapTripRow(row.trips));
}

export async function getTrip(tripId: string): Promise<Trip | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('trips')
    .select(tripSelect)
    .eq('id', tripId)
    .maybeSingle<TripRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapTripRow(data) : null;
}

export async function createTrip(userId: string, values: CreateTripFormValues): Promise<Trip> {
  const supabase = getSupabaseClient();
  const { data: tripRow, error: tripError } = await supabase
    .from('trips')
    .insert({
      owner_id: userId,
      title: values.title,
      description: values.description?.trim() || null,
      timezone: values.timezone,
      starts_on: values.startsOn,
      ends_on: values.endsOn,
    })
    .select(tripSelect)
    .single<TripRow>();

  if (tripError) {
    throw new Error(tripError.message);
  }

  const { error: memberError } = await supabase.from('trip_members').insert({
    trip_id: tripRow.id,
    user_id: userId,
    role: 'owner',
    status: 'joined',
    joined_at: new Date().toISOString(),
  });

  if (memberError) {
    throw new Error(memberError.message);
  }

  await logNonBlocking(() =>
    logTripActivity({
      tripId: tripRow.id,
      eventType: 'trip_created',
      metadata: {
        title: tripRow.title,
      },
    }),
  );

  return mapTripRow(tripRow);
}

export async function updateTripSettings(
  tripId: string,
  values: TripSettingsFormValues,
): Promise<Trip> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('trips')
    .update({
      title: values.title,
      description: values.description?.trim() || null,
      timezone: values.timezone,
      member_can_create_proposals: values.memberCanCreateProposals,
      member_can_create_expenses: values.memberCanCreateExpenses,
    })
    .eq('id', tripId)
    .select(tripSelect)
    .single<TripRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapTripRow(data);
}

export async function getTripMembers(tripId: string): Promise<TripMember[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('trip_members')
    .select('id, trip_id, user_id, role, status, joined_at, profiles(display_name, avatar_url)')
    .eq('trip_id', tripId)
    .eq('status', 'joined')
    .order('role', { ascending: false })
    .returns<TripMemberRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapTripMemberRow);
}

export function getTripNextAction(trip: Trip): string {
  if (trip.status === 'group_created') {
    return 'Invite friends or start the date poll.';
  }

  if (trip.status === 'voting_dates') {
    return 'Wait for members to mark availability.';
  }

  if (trip.status === 'date_decided') {
    return 'Start destination proposals.';
  }

  if (trip.status === 'voting_place') {
    return 'Wait for members to vote on proposals.';
  }

  if (trip.status === 'place_decided') {
    return 'Add planning details and expenses.';
  }

  if (trip.status === 'settling_expenses') {
    return 'Review balances and settlements.';
  }

  if (trip.status === 'closed') {
    return 'This trip is closed and read-only.';
  }

  return 'Continue planning the trip.';
}

async function logNonBlocking(work: () => Promise<void>): Promise<void> {
  try {
    await work();
  } catch {
    // Activity is useful audit context, but it should not undo the primary user action.
  }
}
