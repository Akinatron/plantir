/**
 * Hook de miembros del viaje.
 */

import { useQuery } from '@tanstack/react-query';
import { membersService } from '@/services/members.service';
import type { TripMember, TripId } from '@/types';

export function useTripMembers(tripId: TripId | null | undefined) {
  return useQuery<TripMember[], Error>({
    queryKey: ['trip-members', tripId],
    queryFn: () => {
      if (!tripId) throw new Error('tripId required');
      return membersService.list(tripId).then((r) => {
        if (r.error) throw new Error(r.error.message);
        return r.data;
      });
    },
    enabled: !!tripId,
    staleTime: 60_000,
  });
}
