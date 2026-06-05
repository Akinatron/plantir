import { Trip } from '../../types/trip';
import { Chip } from '../../components/ui/Chip';

type TripStatusBadgeProps = {
  trip: Trip;
};

export function TripStatusBadge({ trip }: TripStatusBadgeProps) {
  const label = getVisibleTripStatus(trip);
  const tone = trip.status === 'closed' ? 'neutral' : trip.confirmedAt ? 'sea' : trip.startsOn && trip.endsOn ? 'sky' : 'sun';

  return <Chip label={label} tone={tone} selected={trip.confirmedAt !== null && trip.status !== 'closed'} />;
}

export function getVisibleTripStatus(trip: Trip): 'Planning trip' | 'Trip planned' | 'Trip confirmed' | 'Closed' {
  if (trip.status === 'closed') {
    return 'Closed';
  }

  if (trip.confirmedAt) {
    return 'Trip confirmed';
  }

  if (trip.startsOn && trip.endsOn) {
    return 'Trip planned';
  }

  return 'Planning trip';
}
