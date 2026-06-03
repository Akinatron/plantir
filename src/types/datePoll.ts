import { AvailabilityStatus, DatePollCandidate } from '../lib/algorithms/datePoll';

export type PollStatus = 'draft' | 'active' | 'closed' | 'reopened';

export type DatePoll = {
  id: string;
  tripId: string;
  status: PollStatus;
  startsOn: string | null;
  endsOn: string | null;
  minTripDays: number | null;
  maxTripDays: number | null;
  preferredDurationDays: number | null;
  votingDeadlineAt: string | null;
  createdBy: string;
  closedAt: string | null;
  createdAt: string;
};

export type DatePollRow = {
  id: string;
  trip_id: string;
  status: PollStatus;
  starts_on: string | null;
  ends_on: string | null;
  min_trip_days: number | null;
  max_trip_days: number | null;
  preferred_duration_days: number | null;
  voting_deadline_at: string | null;
  created_by: string;
  closed_at: string | null;
  created_at: string;
};

export type DatePollAllowedRange = {
  id: string;
  pollId: string;
  startDate: string;
  endDate: string;
};

export type DatePollAllowedRangeRow = {
  id: string;
  poll_id: string;
  starts_on: string;
  ends_on: string;
};

export type DateAvailabilityVote = {
  id: string;
  pollId: string;
  userId: string;
  date: string;
  status: AvailabilityStatus;
};

export type DateAvailabilityVoteRow = {
  id: string;
  poll_id: string;
  user_id: string;
  available_on: string;
  status: AvailabilityStatus;
};

export type DatePollRequiredMember = {
  id: string;
  pollId: string;
  userId: string;
};

export type DatePollRequiredMemberRow = {
  id: string;
  poll_id: string;
  user_id: string;
};

export type DatePollResult = {
  id: string;
  pollId: string;
  startDate: string;
  endDate: string;
  availableMemberCount: number;
  totalMemberCount: number;
  availablePercentage: number;
  durationDays: number;
  preferredDurationDelta: number | null;
  score: number;
  rank: number;
  isWinner: boolean;
  preferredMemberCount: number;
  maybeMemberCount: number;
  unavailableMemberCount: number;
  pendingMemberCount: number;
  requiredMembersMissingCount: number;
  rankReason: string;
  computedAt: string;
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

export type DatePollBundle = {
  poll: DatePoll | null;
  allowedRanges: DatePollAllowedRange[];
  requiredMemberIds: string[];
};

export type DatePollVoteByDate = Record<string, AvailabilityStatus>;

export function mapDatePollRow(row: DatePollRow): DatePoll {
  return {
    id: row.id,
    tripId: row.trip_id,
    status: row.status,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    minTripDays: row.min_trip_days,
    maxTripDays: row.max_trip_days,
    preferredDurationDays: row.preferred_duration_days,
    votingDeadlineAt: row.voting_deadline_at,
    createdBy: row.created_by,
    closedAt: row.closed_at,
    createdAt: row.created_at,
  };
}

export function mapDatePollAllowedRangeRow(row: DatePollAllowedRangeRow): DatePollAllowedRange {
  return {
    id: row.id,
    pollId: row.poll_id,
    startDate: row.starts_on,
    endDate: row.ends_on,
  };
}

export function mapDateAvailabilityVoteRow(row: DateAvailabilityVoteRow): DateAvailabilityVote {
  return {
    id: row.id,
    pollId: row.poll_id,
    userId: row.user_id,
    date: row.available_on,
    status: row.status,
  };
}

export function mapDatePollRequiredMemberRow(row: DatePollRequiredMemberRow): DatePollRequiredMember {
  return {
    id: row.id,
    pollId: row.poll_id,
    userId: row.user_id,
  };
}

export function mapDatePollResultRow(row: DatePollResultRow): DatePollResult {
  return {
    id: row.id,
    pollId: row.poll_id,
    startDate: row.starts_on,
    endDate: row.ends_on,
    availableMemberCount: row.available_member_count,
    totalMemberCount: row.total_member_count,
    availablePercentage: Number(row.available_percentage),
    durationDays: row.duration_days,
    preferredDurationDelta: row.preferred_duration_delta,
    score: row.score,
    rank: row.rank,
    isWinner: row.is_winner,
    preferredMemberCount: row.preferred_member_count,
    maybeMemberCount: row.maybe_member_count,
    unavailableMemberCount: row.unavailable_member_count,
    pendingMemberCount: row.pending_member_count,
    requiredMembersMissingCount: row.required_members_missing_count,
    rankReason: row.rank_reason,
    computedAt: row.computed_at,
  };
}

export function mapCandidateToResultShape(candidate: DatePollCandidate): Pick<
  DatePollResult,
  | 'startDate'
  | 'endDate'
  | 'durationDays'
  | 'availableMemberCount'
  | 'preferredMemberCount'
  | 'maybeMemberCount'
  | 'unavailableMemberCount'
  | 'pendingMemberCount'
  | 'requiredMembersMissingCount'
  | 'score'
  | 'rank'
  | 'rankReason'
> {
  return {
    startDate: candidate.startDate,
    endDate: candidate.endDate,
    durationDays: candidate.durationDays,
    availableMemberCount: candidate.availableMembers.length + candidate.preferredMembers.length,
    preferredMemberCount: candidate.preferredMembers.length,
    maybeMemberCount: candidate.maybeMembers.length,
    unavailableMemberCount: candidate.unavailableMembers.length,
    pendingMemberCount: candidate.pendingMembers.length,
    requiredMembersMissingCount: candidate.requiredMembersMissing.length,
    score: candidate.score,
    rank: candidate.rank,
    rankReason: candidate.rankReason,
  };
}
