import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.107.0';

import {
  AvailabilityStatus,
  DatePollCandidate,
  rankDatePollCandidates,
  UserAvailabilityRange,
} from './datePollAlgorithm.ts';

export type PollRow = {
  id: string;
  trip_id: string;
  status: 'draft' | 'active' | 'closed' | 'reopened';
  starts_on: string | null;
  ends_on: string | null;
  min_trip_days: number | null;
  max_trip_days: number | null;
  preferred_duration_days: number | null;
};

export type DatePollResultRow = {
  id: string;
  poll_id: string;
  starts_on: string;
  ends_on: string;
  available_member_count: number;
  total_member_count: number;
  available_percentage: number;
  duration_days: number;
  preferred_duration_delta: number | null;
  score: number;
  rank: number;
  is_winner: boolean;
  preferred_member_count: number;
  maybe_member_count: number;
  unavailable_member_count: number;
  pending_member_count: number;
  required_members_missing_count: number;
  rank_reason: string;
  computed_at: string;
};

type AllowedRangeRow = {
  starts_on: string;
  ends_on: string;
};

type MemberRow = {
  user_id: string;
};

type VoteRow = {
  user_id: string;
  available_on: string;
  status: AvailabilityStatus;
};

const resultSelect =
  'id, poll_id, starts_on, ends_on, available_member_count, total_member_count, available_percentage, duration_days, preferred_duration_delta, score, rank, is_winner, preferred_member_count, maybe_member_count, unavailable_member_count, pending_member_count, required_members_missing_count, rank_reason, computed_at';

export async function fetchDatePoll(serviceClient: SupabaseClient, pollId: string): Promise<PollRow> {
  const { data, error } = await serviceClient
    .from('polls')
    .select('id, trip_id, status, starts_on, ends_on, min_trip_days, max_trip_days, preferred_duration_days')
    .eq('id', pollId)
    .eq('type', 'date')
    .is('deleted_at', null)
    .maybeSingle<PollRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Date poll not found.');
  }

  return data;
}

export async function computeAndPersistDatePollResults(
  serviceClient: SupabaseClient,
  poll: PollRow,
): Promise<DatePollResultRow[]> {
  if (!poll.min_trip_days || !poll.max_trip_days) {
    throw new Error('Date poll duration settings are incomplete.');
  }

  const [allowedRanges, members, requiredMembers, votes] = await Promise.all([
    fetchAllowedRanges(serviceClient, poll.id),
    fetchJoinedMembers(serviceClient, poll.trip_id),
    fetchRequiredMembers(serviceClient, poll.id),
    fetchVotes(serviceClient, poll.id),
  ]);

  if (allowedRanges.length === 0) {
    throw new Error('Date poll has no allowed date range.');
  }

  const memberIds = members.map((member) => member.user_id);
  const requiredMemberIds = requiredMembers.map((member) => member.user_id);
  const rankedCandidates = rankDatePollCandidates({
    allowedDateRanges: allowedRanges.map((range) => ({
      startDate: range.starts_on,
      endDate: range.ends_on,
    })),
    minTripDays: poll.min_trip_days,
    maxTripDays: poll.max_trip_days,
    preferredDurationDays: poll.preferred_duration_days ?? undefined,
    memberIds,
    requiredMemberIds,
    userAvailabilityRanges: votes.map<UserAvailabilityRange>((vote) => ({
      userId: vote.user_id,
      startDate: vote.available_on,
      endDate: vote.available_on,
      status: vote.status,
    })),
  });

  if (rankedCandidates.length === 0) {
    throw new Error('Date poll has no candidate date ranges.');
  }

  const now = new Date().toISOString();
  const rows = rankedCandidates.slice(0, 25).map((candidate) =>
    candidateToResultInsert(candidate, poll, memberIds.length, now),
  );

  const { error: deleteError } = await serviceClient
    .from('date_poll_results')
    .delete()
    .eq('poll_id', poll.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const { data, error } = await serviceClient
    .from('date_poll_results')
    .insert(rows)
    .select(resultSelect)
    .order('rank', { ascending: true })
    .returns<DatePollResultRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function fetchAllowedRanges(serviceClient: SupabaseClient, pollId: string): Promise<AllowedRangeRow[]> {
  const { data, error } = await serviceClient
    .from('date_poll_allowed_ranges')
    .select('starts_on, ends_on')
    .eq('poll_id', pollId)
    .returns<AllowedRangeRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function fetchJoinedMembers(serviceClient: SupabaseClient, tripId: string): Promise<MemberRow[]> {
  const { data, error } = await serviceClient
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId)
    .eq('status', 'joined')
    .returns<MemberRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function fetchRequiredMembers(serviceClient: SupabaseClient, pollId: string): Promise<MemberRow[]> {
  const { data, error } = await serviceClient
    .from('date_poll_required_members')
    .select('user_id')
    .eq('poll_id', pollId)
    .returns<MemberRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function fetchVotes(serviceClient: SupabaseClient, pollId: string): Promise<VoteRow[]> {
  const { data, error } = await serviceClient
    .from('date_availability_votes')
    .select('user_id, available_on, status')
    .eq('poll_id', pollId)
    .returns<VoteRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

function candidateToResultInsert(
  candidate: DatePollCandidate,
  poll: PollRow,
  totalMemberCount: number,
  computedAt: string,
) {
  const availableMemberCount = candidate.availableMembers.length + candidate.preferredMembers.length;

  return {
    poll_id: poll.id,
    starts_on: candidate.startDate,
    ends_on: candidate.endDate,
    available_member_count: availableMemberCount,
    total_member_count: totalMemberCount,
    available_percentage: totalMemberCount === 0 ? 0 : availableMemberCount / totalMemberCount,
    duration_days: candidate.durationDays,
    preferred_duration_delta:
      poll.preferred_duration_days === null
        ? null
        : Math.abs(candidate.durationDays - poll.preferred_duration_days),
    score: candidate.score,
    rank: candidate.rank,
    is_winner: candidate.rank === 1,
    preferred_member_count: candidate.preferredMembers.length,
    maybe_member_count: candidate.maybeMembers.length,
    unavailable_member_count: candidate.unavailableMembers.length,
    pending_member_count: candidate.pendingMembers.length,
    required_members_missing_count: candidate.requiredMembersMissing.length,
    rank_reason: candidate.rankReason,
    computed_at: computedAt,
  };
}
