import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  closeDestinationPoll,
  computeDestinationResults,
  createDestinationCustomField,
  createDestinationPoll,
  createDestinationProposal,
  createProposalImageSignedUrl,
  deleteDestinationCustomField,
  fetchLinkMetadata,
  getDestinationProposal,
  getLatestDestinationPollBundle,
  getUserDestinationVote,
  listDestinationCustomFieldValues,
  listDestinationCustomFields,
  listDestinationResults,
  listProposalImages,
  updateDestinationCustomField,
  upsertDestinationCustomFieldValues,
  voteForDestinationProposal,
} from '../services/destinationService';
import {
  CloseDestinationPollFormValues,
  DestinationCustomFieldFormValues,
  DestinationSetupFormValues,
  DestinationVoteFormValues,
  ParsedUpsertDestinationCustomFieldValuesFormValues,
  ParsedDestinationProposalFormValues,
  UpdateDestinationCustomFieldFormValues,
} from '../lib/validation/destination';
import { tripQueryKey, tripsQueryKey } from './useTrips';

export const destinationBundleQueryKey = (tripId: string | null | undefined) => ['destination', tripId] as const;
export const destinationProposalQueryKey = (proposalId: string | null | undefined) =>
  ['destination-proposal', proposalId] as const;
export const destinationProposalImagesQueryKey = (proposalId: string | null | undefined) =>
  ['destination-proposal-images', proposalId] as const;
export const destinationVoteQueryKey = (
  pollId: string | null | undefined,
  userId: string | null | undefined,
) => ['destination-vote', pollId, userId] as const;
export const destinationResultsQueryKey = (pollId: string | null | undefined) =>
  ['destination-results', pollId] as const;
export const destinationCustomFieldsQueryKey = (
  tripId: string | null | undefined,
  pollId: string | null | undefined,
) => ['destination-custom-fields', tripId, pollId] as const;
export const destinationCustomFieldValuesQueryKey = (proposalId: string | null | undefined) =>
  ['destination-custom-field-values', proposalId] as const;

export function useDestinationBundleQuery(tripId: string | null | undefined) {
  return useQuery({
    queryKey: destinationBundleQueryKey(tripId),
    queryFn: () => {
      if (!tripId) {
        throw new Error('Cannot load destination poll without a trip id.');
      }

      return getLatestDestinationPollBundle(tripId);
    },
    enabled: Boolean(tripId),
  });
}

export function useDestinationProposalQuery(proposalId: string | null | undefined) {
  return useQuery({
    queryKey: destinationProposalQueryKey(proposalId),
    queryFn: () => {
      if (!proposalId) {
        throw new Error('Cannot load proposal without a proposal id.');
      }

      return getDestinationProposal(proposalId);
    },
    enabled: Boolean(proposalId),
  });
}

export function useProposalImagesQuery(proposalId: string | null | undefined) {
  return useQuery({
    queryKey: destinationProposalImagesQueryKey(proposalId),
    queryFn: async () => {
      if (!proposalId) {
        throw new Error('Cannot load proposal images without a proposal id.');
      }

      const images = await listProposalImages(proposalId);
      return Promise.all(
        images.map(async (image) => ({
          ...image,
          signedUrl: await createProposalImageSignedUrl(image.storagePath),
        })),
      );
    },
    enabled: Boolean(proposalId),
  });
}

export function useUserDestinationVoteQuery(
  pollId: string | null | undefined,
  userId: string | null | undefined,
) {
  return useQuery({
    queryKey: destinationVoteQueryKey(pollId, userId),
    queryFn: () => {
      if (!pollId || !userId) {
        throw new Error('Cannot load destination vote without poll and user ids.');
      }

      return getUserDestinationVote(pollId, userId);
    },
    enabled: Boolean(pollId && userId),
  });
}

export function useDestinationResultsQuery(pollId: string | null | undefined) {
  return useQuery({
    queryKey: destinationResultsQueryKey(pollId),
    queryFn: () => {
      if (!pollId) {
        throw new Error('Cannot load destination results without a poll id.');
      }

      return listDestinationResults(pollId);
    },
    enabled: Boolean(pollId),
  });
}

export function useDestinationCustomFieldsQuery(
  tripId: string | null | undefined,
  pollId?: string | null,
) {
  return useQuery({
    queryKey: destinationCustomFieldsQueryKey(tripId, pollId),
    queryFn: () => {
      if (!tripId) {
        throw new Error('Cannot load custom fields without a trip id.');
      }

      return listDestinationCustomFields(tripId, pollId);
    },
    enabled: Boolean(tripId),
  });
}

export function useDestinationCustomFieldValuesQuery(proposalId: string | null | undefined) {
  return useQuery({
    queryKey: destinationCustomFieldValuesQueryKey(proposalId),
    queryFn: () => {
      if (!proposalId) {
        throw new Error('Cannot load custom field values without a proposal id.');
      }

      return listDestinationCustomFieldValues(proposalId);
    },
    enabled: Boolean(proposalId),
  });
}

export function useCreateDestinationPollMutation(userId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: DestinationSetupFormValues) => {
      if (!userId) {
        throw new Error('Cannot create destination poll without a user id.');
      }

      return createDestinationPoll(userId, values);
    },
    onSuccess: (poll) => {
      queryClient.invalidateQueries({ queryKey: destinationBundleQueryKey(poll.tripId) });
      queryClient.invalidateQueries({ queryKey: tripQueryKey(poll.tripId) });
      queryClient.invalidateQueries({ queryKey: tripsQueryKey(undefined).slice(0, 1) });
    },
  });
}

export function useCreateDestinationProposalMutation(userId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ParsedDestinationProposalFormValues) => {
      if (!userId) {
        throw new Error('Cannot create proposal without a user id.');
      }

      return createDestinationProposal(userId, values);
    },
    onSuccess: (proposal) => {
      queryClient.invalidateQueries({ queryKey: destinationBundleQueryKey(proposal.tripId) });
      queryClient.setQueryData(destinationProposalQueryKey(proposal.id), proposal);
    },
  });
}

export function useVoteForDestinationProposalMutation(tripId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: DestinationVoteFormValues) => voteForDestinationProposal(values),
    onSuccess: (vote) => {
      queryClient.invalidateQueries({ queryKey: destinationVoteQueryKey(vote.pollId, vote.userId) });
      queryClient.invalidateQueries({ queryKey: destinationResultsQueryKey(vote.pollId) });

      if (tripId) {
        queryClient.invalidateQueries({ queryKey: destinationBundleQueryKey(tripId) });
      }
    },
  });
}

export function useComputeDestinationResultsMutation(pollId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!pollId) {
        throw new Error('Cannot compute destination results without a poll id.');
      }

      return computeDestinationResults(pollId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: destinationResultsQueryKey(pollId) });
    },
  });
}

export function useCloseDestinationPollMutation(tripId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CloseDestinationPollFormValues) => closeDestinationPoll(values),
    onSuccess: (closed) => {
      queryClient.invalidateQueries({ queryKey: destinationBundleQueryKey(tripId ?? closed.tripId) });
      queryClient.invalidateQueries({ queryKey: tripQueryKey(closed.tripId) });
      queryClient.invalidateQueries({ queryKey: tripsQueryKey(undefined).slice(0, 1) });
      queryClient.invalidateQueries({ queryKey: destinationResultsQueryKey(closed.winner.pollId) });
    },
  });
}

export function useFetchLinkMetadataMutation() {
  return useMutation({
    mutationFn: fetchLinkMetadata,
  });
}

export function useCreateDestinationCustomFieldMutation(
  userId: string | null | undefined,
  tripId: string | null | undefined,
  pollId?: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: DestinationCustomFieldFormValues) => {
      if (!userId) {
        throw new Error('Cannot create custom field without a user id.');
      }

      return createDestinationCustomField(userId, values);
    },
    onSuccess: (field) => {
      queryClient.invalidateQueries({ queryKey: destinationCustomFieldsQueryKey(tripId ?? field.tripId, pollId) });
    },
  });
}

export function useUpdateDestinationCustomFieldMutation(
  tripId: string | null | undefined,
  pollId?: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: UpdateDestinationCustomFieldFormValues) => updateDestinationCustomField(values),
    onSuccess: (field) => {
      queryClient.invalidateQueries({ queryKey: destinationCustomFieldsQueryKey(tripId ?? field.tripId, pollId) });
    },
  });
}

export function useDeleteDestinationCustomFieldMutation(
  tripId: string | null | undefined,
  pollId?: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDestinationCustomField,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: destinationCustomFieldsQueryKey(tripId, pollId) });
    },
  });
}

export function useUpsertDestinationCustomFieldValuesMutation(proposalId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ParsedUpsertDestinationCustomFieldValuesFormValues) =>
      upsertDestinationCustomFieldValues(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: destinationCustomFieldValuesQueryKey(proposalId) });
    },
  });
}
