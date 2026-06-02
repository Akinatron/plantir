/**
 * Hook de date poll: rangos permitidos, mis votos, resultados.
 */

import { useQuery } from '@tanstack/react-query';
import { pollsService } from '@/services/polls.service';
import { useSession } from '@/stores/session.store';
import type {
  DateAvailabilityVote,
  DatePollAllowedRange,
  DatePollResult,
  PollId,
} from '@/types';

export function useDatePoll(pollId: PollId | null | undefined) {
  const session = useSession();

  const allowedRanges = useQuery<DatePollAllowedRange[], Error>({
    queryKey: ['date-poll', pollId, 'ranges'],
    queryFn: () => {
      if (!pollId) throw new Error('pollId required');
      return pollsService.getAllowedRanges(pollId).then((r) => {
        if (r.error) throw new Error(r.error.message);
        return r.data;
      });
    },
    enabled: !!pollId,
    staleTime: 5 * 60_000, // 5 min
  });

  const myVotes = useQuery<DateAvailabilityVote[], Error>({
    queryKey: ['date-poll', pollId, 'my-votes', session.user?.id],
    queryFn: () => {
      if (!pollId || !session.user) throw new Error('pollId and user required');
      return pollsService
        .getMyDateVotes(pollId, session.user.id as unknown as string)
        .then((r) => {
          if (r.error) throw new Error(r.error.message);
          return r.data;
        });
    },
    enabled: !!pollId && !!session.user,
    staleTime: 30_000,
  });

  const results = useQuery<DatePollResult[], Error>({
    queryKey: ['date-poll', pollId, 'results'],
    queryFn: () => {
      if (!pollId) throw new Error('pollId required');
      return pollsService.getDateResults(pollId).then((r) => {
        if (r.error) throw new Error(r.error.message);
        return r.data;
      });
    },
    enabled: !!pollId,
    staleTime: 60_000,
  });

  return { allowedRanges, myVotes, results };
}
