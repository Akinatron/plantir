/**
 * Hook de Trip: query tipada con TanStack Query.
 */

import { useQuery } from '@tanstack/react-query';
import { tripsService } from '@/services/trips.service';
import type { Trip, TripId } from '@/types';

export function useTrip(tripId: TripId | null | undefined) {
  return useQuery<Trip, Error>({
    queryKey: ['trip', tripId],
    queryFn: () => {
      if (!tripId) throw new Error('tripId required');
      return tripsService.getById(tripId).then((r) => {
        if (r.error) throw new Error(r.error.message);
        return r.data;
      });
    },
    enabled: !!tripId,
    staleTime: 30_000, // 30s
  });
}

export function useTrips() {
  return useQuery<Trip[], Error>({
    queryKey: ['trips'],
    queryFn: () =>
      tripsService.list().then((r) => {
        if (r.error) throw new Error(r.error.message);
        return r.data;
      }),
    staleTime: 60_000,
  });
}
