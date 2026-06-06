import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  closeTrip,
  confirmTrip,
  createTrip,
  getTrip,
  getTripMembers,
  listTripsForUser,
  reopenTrip,
  updateTripMemberRole,
  updateTripSettings,
} from '../services/tripService';
import {
  ConfirmTripFormValues,
  CreateTripFormValues,
  TripSettingsFormValues,
  UpdateTripMemberRoleFormValues,
  tripSettingsSchema,
} from '../lib/validation/trip';

export const tripsQueryKey = (userId: string | null | undefined) => ['trips', userId] as const;
export const tripQueryKey = (tripId: string | null | undefined) => ['trip', tripId] as const;
export const tripMembersQueryKey = (tripId: string | null | undefined) => ['trip-members', tripId] as const;

export function useTripsQuery(userId: string | null | undefined) {
  return useQuery({
    queryKey: tripsQueryKey(userId),
    queryFn: () => {
      if (!userId) {
        throw new Error('Cannot load trips without a user id.');
      }

      return listTripsForUser(userId);
    },
    enabled: Boolean(userId),
  });
}

export function useTripQuery(tripId: string | null | undefined) {
  return useQuery({
    queryKey: tripQueryKey(tripId),
    queryFn: () => {
      if (!tripId) {
        throw new Error('Cannot load trip without a trip id.');
      }

      return getTrip(tripId);
    },
    enabled: Boolean(tripId),
  });
}

export function useTripMembersQuery(tripId: string | null | undefined) {
  return useQuery({
    queryKey: tripMembersQueryKey(tripId),
    queryFn: () => {
      if (!tripId) {
        throw new Error('Cannot load trip members without a trip id.');
      }

      return getTripMembers(tripId);
    },
    enabled: Boolean(tripId),
  });
}

export function useCreateTripMutation(userId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreateTripFormValues) => {
      if (!userId) {
        throw new Error('Cannot create trip without a user id.');
      }

      return createTrip(userId, values);
    },
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: tripsQueryKey(userId) });
      queryClient.setQueryData(tripQueryKey(trip.id), trip);
    },
  });
}

export function useUpdateTripSettingsMutation(tripId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: TripSettingsFormValues) => {
      if (!tripId) {
        throw new Error('Cannot update trip without a trip id.');
      }

      return updateTripSettings(tripId, tripSettingsSchema.parse(values));
    },
    onSuccess: (trip) => {
      queryClient.setQueryData(tripQueryKey(trip.id), trip);
      queryClient.invalidateQueries({ queryKey: tripsQueryKey(undefined).slice(0, 1) });
    },
  });
}

export function useConfirmTripMutation(tripId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ConfirmTripFormValues) => {
      if (!tripId) {
        throw new Error('Cannot confirm trip without a trip id.');
      }

      return confirmTrip(values);
    },
    onSuccess: (trip) => {
      queryClient.setQueryData(tripQueryKey(trip.id), trip);
      queryClient.invalidateQueries({ queryKey: tripsQueryKey(undefined).slice(0, 1) });
    },
  });
}

export function useCloseTripMutation(tripId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!tripId) {
        throw new Error('Cannot close trip without a trip id.');
      }

      return closeTrip(tripId);
    },
    onSuccess: (trip) => {
      queryClient.setQueryData(tripQueryKey(trip.id), trip);
      queryClient.invalidateQueries({ queryKey: tripsQueryKey(undefined).slice(0, 1) });
    },
  });
}

export function useReopenTripMutation(tripId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!tripId) {
        throw new Error('Cannot reopen trip without a trip id.');
      }

      return reopenTrip(tripId);
    },
    onSuccess: (trip) => {
      queryClient.setQueryData(tripQueryKey(trip.id), trip);
      queryClient.invalidateQueries({ queryKey: tripsQueryKey(undefined).slice(0, 1) });
    },
  });
}

export function useUpdateTripMemberRoleMutation(tripId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: UpdateTripMemberRoleFormValues) => updateTripMemberRole(values),
    onSuccess: (member) => {
      queryClient.invalidateQueries({ queryKey: tripMembersQueryKey(tripId ?? member.tripId) });
    },
  });
}
