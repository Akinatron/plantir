import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  closeDestinationPoll,
  computeDestinationResults,
  createDestinationPoll,
  createDestinationProposal,
  createProposalImageSignedUrl,
  fetchLinkMetadata,
  getDestinationProposal,
  getLatestDestinationPollBundle,
  getUserDestinationVote,
  listDestinationResults,
  listProposalImages,
  voteForDestinationProposal,
} from '../services/destinationService';
import {
  CloseDestinationPollFormValues,
  DestinationSetupFormValues,
  DestinationVoteFormValues,
  ParsedDestinationProposalFormValues,
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
