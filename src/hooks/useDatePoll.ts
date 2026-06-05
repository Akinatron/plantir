import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  closeDatePoll,
  computeDatePollResults,
  createDatePoll,
  getLatestDatePollBundle,
  getUserDatePollVotes,
  listDatePollVotes,
  listDatePollResults,
  saveDatePollVotes,
} from '../services/datePollService';
import { DatePollSetupFormValues, DatePollVoteFormValues } from '../lib/validation/datePoll';
import { tripQueryKey, tripsQueryKey } from './useTrips';

export const datePollBundleQueryKey = (tripId: string | null | undefined) => ['date-poll', tripId] as const;
export const datePollVotesQueryKey = (
  pollId: string | null | undefined,
  userId: string | null | undefined,
) => ['date-poll-votes', pollId, userId] as const;
export const datePollResultsQueryKey = (pollId: string | null | undefined) =>
  ['date-poll-results', pollId] as const;
export const datePollAllVotesQueryKey = (pollId: string | null | undefined) =>
  ['date-poll-all-votes', pollId] as const;

export function useDatePollBundleQuery(tripId: string | null | undefined) {
  return useQuery({
    queryKey: datePollBundleQueryKey(tripId),
    queryFn: () => {
      if (!tripId) {
        throw new Error('Cannot load date poll without a trip id.');
      }

      return getLatestDatePollBundle(tripId);
    },
    enabled: Boolean(tripId),
  });
}

export function useUserDatePollVotesQuery(
  pollId: string | null | undefined,
  userId: string | null | undefined,
) {
  return useQuery({
    queryKey: datePollVotesQueryKey(pollId, userId),
    queryFn: () => {
      if (!pollId || !userId) {
        throw new Error('Cannot load date votes without poll and user ids.');
      }

      return getUserDatePollVotes(pollId, userId);
    },
    enabled: Boolean(pollId && userId),
  });
}

export function useDatePollVotesQuery(pollId: string | null | undefined) {
  return useQuery({
    queryKey: datePollAllVotesQueryKey(pollId),
    queryFn: () => {
      if (!pollId) {
        throw new Error('Cannot load date votes without a poll id.');
      }

      return listDatePollVotes(pollId);
    },
    enabled: Boolean(pollId),
  });
}

export function useDatePollResultsQuery(pollId: string | null | undefined) {
  return useQuery({
    queryKey: datePollResultsQueryKey(pollId),
    queryFn: () => {
      if (!pollId) {
        throw new Error('Cannot load date poll results without a poll id.');
      }

      return listDatePollResults(pollId);
    },
    enabled: Boolean(pollId),
  });
}

export function useCreateDatePollMutation(userId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: DatePollSetupFormValues) => {
      if (!userId) {
        throw new Error('Cannot create date poll without a user id.');
      }

      return createDatePoll(userId, values);
    },
    onSuccess: (poll) => {
      queryClient.invalidateQueries({ queryKey: datePollBundleQueryKey(poll.tripId) });
      queryClient.invalidateQueries({ queryKey: tripQueryKey(poll.tripId) });
      queryClient.invalidateQueries({ queryKey: tripsQueryKey(undefined).slice(0, 1) });
    },
  });
}

export function useSaveDatePollVotesMutation(tripId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: DatePollVoteFormValues) => saveDatePollVotes(values),
    onSuccess: (_votes, values) => {
      queryClient.invalidateQueries({ queryKey: datePollVotesQueryKey(values.pollId, values.userId) });
      queryClient.invalidateQueries({ queryKey: datePollAllVotesQueryKey(values.pollId) });
      queryClient.invalidateQueries({ queryKey: datePollResultsQueryKey(values.pollId) });

      if (tripId) {
        queryClient.invalidateQueries({ queryKey: datePollBundleQueryKey(tripId) });
      }
    },
  });
}

export function useComputeDatePollResultsMutation(pollId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!pollId) {
        throw new Error('Cannot compute results without a poll id.');
      }

      return computeDatePollResults(pollId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: datePollResultsQueryKey(pollId) });
    },
  });
}

export function useCloseDatePollMutation(tripId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: closeDatePoll,
    onSuccess: (closed) => {
      queryClient.invalidateQueries({ queryKey: datePollBundleQueryKey(tripId ?? closed.tripId) });
      queryClient.invalidateQueries({ queryKey: tripQueryKey(closed.tripId) });
      queryClient.invalidateQueries({ queryKey: tripsQueryKey(undefined).slice(0, 1) });
      queryClient.invalidateQueries({ queryKey: datePollResultsQueryKey(closed.winner.pollId) });
    },
  });
}
