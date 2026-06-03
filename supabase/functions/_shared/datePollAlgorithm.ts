export type AvailabilityStatus = 'preferred' | 'available' | 'maybe' | 'unavailable';

export type DateRange = {
  startDate: string;
  endDate: string;
};

export type UserAvailabilityRange = DateRange & {
  userId: string;
  status: AvailabilityStatus;
};

export type DatePollInput = {
  allowedDateRanges: DateRange[];
  minTripDays: number;
  maxTripDays: number;
  userAvailabilityRanges: UserAvailabilityRange[];
  memberIds: string[];
  requiredMemberIds: string[];
  preferredDurationDays?: number;
};

export type DatePollCandidate = DateRange & {
  durationDays: number;
  availableMembers: string[];
  preferredMembers: string[];
  maybeMembers: string[];
  unavailableMembers: string[];
  pendingMembers: string[];
  requiredMembersMissing: string[];
  score: number;
  rank: number;
  rankReason: string;
};

type InternalCandidate = Omit<DatePollCandidate, 'rank' | 'rankReason'> & {
  availablePercentageBasisPoints: number;
  preferredDurationDelta?: number;
};

const millisecondsPerDay = 86_400_000;
const weights = {
  preferred: 4,
  available: 3,
  maybe: 1,
  unavailable: -4,
};

export function rankDatePollCandidates(input: DatePollInput): DatePollCandidate[] {
  const memberIds = [...new Set(input.memberIds)].sort();
  const requiredMemberIds = [...new Set(input.requiredMemberIds)].sort();
  const candidates = generateCandidateRanges(input.allowedDateRanges, input.minTripDays, input.maxTripDays)
    .map((range) => scoreCandidate(range, memberIds, requiredMemberIds, input))
    .sort(compareCandidates);

  return candidates.map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
    rankReason: buildRankReason(candidate),
  }));
}

function generateCandidateRanges(
  allowedDateRanges: readonly DateRange[],
  minTripDays: number,
  maxTripDays: number,
): DateRange[] {
  const candidates: DateRange[] = [];
  const seen = new Set<string>();

  for (const allowedRange of allowedDateRanges) {
    const allowedStart = parseIsoDate(allowedRange.startDate);
    const allowedEnd = parseIsoDate(allowedRange.endDate);
    const allowedDuration = differenceInDaysInclusive(allowedStart, allowedEnd);
    const cappedMax = Math.min(maxTripDays, allowedDuration);

    for (let offset = 0; offset < allowedDuration; offset += 1) {
      const start = addDays(allowedStart, offset);

      for (let durationDays = minTripDays; durationDays <= cappedMax; durationDays += 1) {
        const end = addDays(start, durationDays - 1);

        if (end.getTime() > allowedEnd.getTime()) {
          break;
        }

        const candidate = { startDate: toIsoDate(start), endDate: toIsoDate(end) };
        const key = `${candidate.startDate}:${candidate.endDate}`;

        if (!seen.has(key)) {
          seen.add(key);
          candidates.push(candidate);
        }
      }
    }
  }

  return candidates;
}

function scoreCandidate(
  range: DateRange,
  memberIds: readonly string[],
  requiredMemberIds: readonly string[],
  input: DatePollInput,
): InternalCandidate {
  const preferredMembers: string[] = [];
  const availableMembers: string[] = [];
  const maybeMembers: string[] = [];
  const unavailableMembers: string[] = [];
  const pendingMembers: string[] = [];
  let score = 0;

  for (const memberId of memberIds) {
    const status = getMemberStatusForRange(memberId, range, input.userAvailabilityRanges);

    if (status === 'preferred') {
      preferredMembers.push(memberId);
      score += weights.preferred;
    } else if (status === 'available') {
      availableMembers.push(memberId);
      score += weights.available;
    } else if (status === 'maybe') {
      maybeMembers.push(memberId);
      score += weights.maybe;
    } else if (status === 'unavailable') {
      unavailableMembers.push(memberId);
      score += weights.unavailable;
    } else {
      pendingMembers.push(memberId);
      score += weights.unavailable;
    }
  }

  const availableOrPreferred = new Set([...preferredMembers, ...availableMembers]);
  const requiredMembersMissing = requiredMemberIds.filter((memberId) => !availableOrPreferred.has(memberId));
  const durationDays = differenceInDaysInclusive(parseIsoDate(range.startDate), parseIsoDate(range.endDate));
  const preferredDurationDelta =
    input.preferredDurationDays === undefined
      ? undefined
      : Math.abs(durationDays - input.preferredDurationDays);
  const availablePercentageBasisPoints =
    memberIds.length === 0 ? 0 : Math.trunc((availableOrPreferred.size * 10_000) / memberIds.length);

  return {
    ...range,
    durationDays,
    preferredMembers,
    availableMembers,
    maybeMembers,
    unavailableMembers,
    pendingMembers,
    requiredMembersMissing,
    score,
    availablePercentageBasisPoints,
    preferredDurationDelta,
  };
}

function getMemberStatusForRange(
  memberId: string,
  candidate: DateRange,
  availabilityRanges: readonly UserAvailabilityRange[],
): AvailabilityStatus | 'pending' {
  const statuses = expandDateRange(candidate).map((day) =>
    getMemberStatusForDay(memberId, day, availabilityRanges),
  );

  if (statuses.some((status) => status === 'unavailable')) {
    return 'unavailable';
  }

  if (statuses.some((status) => status === 'pending')) {
    return 'pending';
  }

  if (statuses.every((status) => status === 'preferred')) {
    return 'preferred';
  }

  if (statuses.some((status) => status === 'maybe')) {
    return 'maybe';
  }

  return 'available';
}

function getMemberStatusForDay(
  memberId: string,
  day: string,
  availabilityRanges: readonly UserAvailabilityRange[],
): AvailabilityStatus | 'pending' {
  const vote = availabilityRanges.find(
    (range) => range.userId === memberId && range.startDate <= day && range.endDate >= day,
  );

  return vote?.status ?? 'pending';
}

function compareCandidates(left: InternalCandidate, right: InternalCandidate): number {
  const leftAvailableOrPreferred = left.availableMembers.length + left.preferredMembers.length;
  const rightAvailableOrPreferred = right.availableMembers.length + right.preferredMembers.length;

  return (
    right.score - left.score ||
    rightAvailableOrPreferred - leftAvailableOrPreferred ||
    right.availablePercentageBasisPoints - left.availablePercentageBasisPoints ||
    (left.preferredDurationDelta ?? 0) - (right.preferredDurationDelta ?? 0) ||
    left.requiredMembersMissing.length - right.requiredMembersMissing.length ||
    right.preferredMembers.length - left.preferredMembers.length ||
    right.maybeMembers.length - left.maybeMembers.length ||
    left.pendingMembers.length - right.pendingMembers.length ||
    left.startDate.localeCompare(right.startDate) ||
    left.endDate.localeCompare(right.endDate)
  );
}

function buildRankReason(candidate: InternalCandidate): string {
  const parts = [
    `score: ${candidate.score}`,
    `available/preferred members: ${candidate.availableMembers.length + candidate.preferredMembers.length}`,
    `available percentage bps: ${candidate.availablePercentageBasisPoints}`,
    `required missing: ${candidate.requiredMembersMissing.length}`,
    `preferred members: ${candidate.preferredMembers.length}`,
    `maybe members: ${candidate.maybeMembers.length}`,
    `pending members: ${candidate.pendingMembers.length}`,
  ];

  if (candidate.preferredDurationDelta !== undefined) {
    parts.push(`preferred duration delta: ${candidate.preferredDurationDelta}`);
  }

  parts.push(`start date: ${candidate.startDate}`);
  return parts.join('; ');
}

function expandDateRange(range: DateRange): string[] {
  const start = parseIsoDate(range.startDate);
  const end = parseIsoDate(range.endDate);
  const duration = differenceInDaysInclusive(start, end);

  return Array.from({ length: duration }, (_, index) => toIsoDate(addDays(start, index)));
}

function parseIsoDate(value: string): Date {
  const [yearText, monthText, dayText] = value.split('-');
  return new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * millisecondsPerDay);
}

function differenceInDaysInclusive(start: Date, end: Date): number {
  return Math.trunc((end.getTime() - start.getTime()) / millisecondsPerDay) + 1;
}
