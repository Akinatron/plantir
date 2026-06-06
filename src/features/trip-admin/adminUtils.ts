import { Trip, TripMember } from '../../types/trip';

export function canManageTrip(userId: string | null | undefined, members: TripMember[]): boolean {
  const role = members.find((member) => member.userId === userId)?.role;
  return role === 'owner' || role === 'admin';
}

export function roleDescription(role: TripMember['role']): string {
  if (role === 'owner') {
    return 'Owns this trip';
  }

  if (role === 'admin') {
    return 'Can manage trip settings';
  }

  return 'Can plan, vote, and add allowed items';
}

export function visibleTripState(trip: Trip | null | undefined): string {
  if (!trip) {
    return 'Loading';
  }

  if (trip.closedAt || trip.status === 'closed') {
    return 'Closed';
  }

  if (trip.confirmedAt) {
    return 'Trip confirmed';
  }

  if (trip.startsOn && trip.endsOn && trip.status !== 'group_created') {
    return 'Trip planned';
  }

  return 'Planning trip';
}

export function formatInstant(value: string | null): string {
  if (!value) {
    return 'No time limit';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}
