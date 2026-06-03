import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  acceptTripInvite,
  createTripInvite,
  listTripInvites,
  revokeTripInvite,
} from '../services/inviteService';
import { CreateInviteFormValues, createInviteSchema } from '../lib/validation/trip';
import { tripMembersQueryKey, tripsQueryKey } from './useTrips';

export const tripInvitesQueryKey = (tripId: string | null | undefined) => ['trip-invites', tripId] as const;

export function useTripInvitesQuery(tripId: string | null | undefined) {
  return useQuery({
    queryKey: tripInvitesQueryKey(tripId),
    queryFn: () => {
      if (!tripId) {
        throw new Error('Cannot load invites without a trip id.');
      }

      return listTripInvites(tripId);
    },
    enabled: Boolean(tripId),
  });
}

export function useCreateTripInviteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreateInviteFormValues) => createTripInvite(createInviteSchema.parse(values)),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: tripInvitesQueryKey(created.invite.tripId) });
    },
  });
}

export function useRevokeTripInviteMutation(tripId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeTripInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripInvitesQueryKey(tripId) });
    },
  });
}

export function useAcceptTripInviteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: acceptTripInvite,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: tripsQueryKey(undefined).slice(0, 1) });

      if (result.tripId) {
        queryClient.invalidateQueries({ queryKey: tripMembersQueryKey(result.tripId) });
      }
    },
  });
}
