export type IsoDate = string;

export type DateRange = {
  startDate: IsoDate;
  endDate: IsoDate;
};

export type AvailabilityStatus = 'preferred' | 'available' | 'maybe' | 'unavailable';

export type UserAvailabilityRange = DateRange & {
  userId: string;
  status: AvailabilityStatus;
};

export type PendingPolicy = 'countAsUnavailable' | 'countAsMaybe' | 'ignore';

export type DatePollWeights = {
  preferred: number;
  available: number;
  maybe: number;
  unavailable: number;
};

export type RankReason = {
  score: number;
  requiredMembersMissing: number;
  availableOrPreferredMembers: number;
  availablePercentageBasisPoints: number;
  preferredMembers: number;
  maybeMembers: number;
  pendingMembers: number;
  preferredDurationDelta?: number;
  startDate: IsoDate;
};

export type DatePollInput = {
  allowedDateRanges: DateRange[];
  minTripDays: number;
  maxTripDays: number;
  userAvailabilityRanges: UserAvailabilityRange[];
  memberIds: string[];
  requiredMemberIds: string[];
  preferredDurationDays?: number;
  weights: DatePollWeights;
  pendingPolicy: PendingPolicy;
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
  reason: RankReason;
};

const millisecondsPerDay = 86_400_000;

export function rankDatePollCandidates(input: DatePollInput): DatePollCandidate[] {
  validateDatePollInput(input);

  const memberIds = [...new Set(input.memberIds)].sort();
  const requiredMemberIds = [...new Set(input.requiredMemberIds)].sort();
  const candidates = generateCandidateRanges(
    input.allowedDateRanges,
    input.minTripDays,
    input.maxTripDays,
  );

  const ranked = candidates
    .map((range) => scoreCandidate(range, memberIds, requiredMemberIds, input))
    .sort(compareCandidates);

  return ranked.map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
    rankReason: buildRankReason(candidate),
  }));
}

export function getWinningDateRange(input: DatePollInput): DatePollCandidate | null {
  return rankDatePollCandidates(input)[0] ?? null;
}

function validateDatePollInput(input: DatePollInput): void {
  if (!Number.isSafeInteger(input.minTripDays) || input.minTripDays <= 0) {
    throw new Error('minTripDays must be a positive integer.');
  }

  if (!Number.isSafeInteger(input.maxTripDays) || input.maxTripDays < input.minTripDays) {
    throw new Error('maxTripDays must be an integer greater than or equal to minTripDays.');
  }

  if (
    input.preferredDurationDays !== undefined &&
    (!Number.isSafeInteger(input.preferredDurationDays) || input.preferredDurationDays <= 0)
  ) {
    throw new Error('preferredDurationDays must be a positive integer when provided.');
  }

  const memberSet = new Set(input.memberIds);
  for (const requiredMemberId of input.requiredMemberIds) {
    if (!memberSet.has(requiredMemberId)) {
      throw new Error('requiredMemberIds must be included in memberIds.');
    }
  }

  for (const range of input.allowedDateRanges) {
    assertValidDateRange(range);
  }

  for (const range of input.userAvailabilityRanges) {
    assertValidDateRange(range);
  }
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
      score += input.weights.preferred;
    } else if (status === 'available') {
      availableMembers.push(memberId);
      score += input.weights.available;
    } else if (status === 'maybe') {
      maybeMembers.push(memberId);
      score += input.weights.maybe;
    } else if (status === 'unavailable') {
      unavailableMembers.push(memberId);
      score += input.weights.unavailable;
    } else if (input.pendingPolicy === 'countAsMaybe') {
      pendingMembers.push(memberId);
      score += input.weights.maybe;
    } else if (input.pendingPolicy === 'countAsUnavailable') {
      pendingMembers.push(memberId);
      score += input.weights.unavailable;
    } else {
      pendingMembers.push(memberId);
    }
  }

  const availableOrPreferred = new Set([...preferredMembers, ...availableMembers]);
  const requiredMembersMissing = requiredMemberIds.filter((memberId) => !availableOrPreferred.has(memberId));
  const start = parseIsoDate(range.startDate);
  const end = parseIsoDate(range.endDate);
  const durationDays = differenceInDaysInclusive(start, end);
  const preferredDelta =
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
    reason: {
      score,
      requiredMembersMissing: requiredMembersMissing.length,
      availableOrPreferredMembers: availableOrPreferred.size,
      availablePercentageBasisPoints,
      preferredMembers: preferredMembers.length,
      maybeMembers: maybeMembers.length,
      pendingMembers: pendingMembers.length,
      preferredDurationDelta: preferredDelta,
      startDate: range.startDate,
    },
  };
}

function getMemberStatusForRange(
  memberId: string,
  candidate: DateRange,
  availabilityRanges: readonly UserAvailabilityRange[],
): AvailabilityStatus | 'pending' {
  const days = expandDateRange(candidate);
  const statuses = days.map((day) => getMemberStatusForDay(memberId, day, availabilityRanges));

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
  day: IsoDate,
  availabilityRanges: readonly UserAvailabilityRange[],
): AvailabilityStatus | 'pending' {
  const ranges = availabilityRanges.filter(
    (range) =>
      range.userId === memberId &&
      compareIsoDates(range.startDate, day) <= 0 &&
      compareIsoDates(range.endDate, day) >= 0,
  );

  if (ranges.length === 0) {
    return 'pending';
  }

  if (ranges.some((range) => range.status === 'unavailable')) {
    return 'unavailable';
  }

  if (ranges.some((range) => range.status === 'preferred')) {
    return 'preferred';
  }

  if (ranges.some((range) => range.status === 'available')) {
    return 'available';
  }

  return 'maybe';
}

function compareCandidates(left: InternalCandidate, right: InternalCandidate): number {
  const preferredDeltaLeft = left.reason.preferredDurationDelta ?? 0;
  const preferredDeltaRight = right.reason.preferredDurationDelta ?? 0;

  return (
    right.reason.score - left.reason.score ||
    right.reason.availableOrPreferredMembers - left.reason.availableOrPreferredMembers ||
    right.reason.availablePercentageBasisPoints - left.reason.availablePercentageBasisPoints ||
    preferredDeltaLeft - preferredDeltaRight ||
    left.reason.requiredMembersMissing - right.reason.requiredMembersMissing ||
    right.reason.preferredMembers - left.reason.preferredMembers ||
    right.reason.maybeMembers - left.reason.maybeMembers ||
    left.reason.pendingMembers - right.reason.pendingMembers ||
    compareIsoDates(left.startDate, right.startDate) ||
    compareIsoDates(left.endDate, right.endDate)
  );
}

function buildRankReason(candidate: InternalCandidate): string {
  const parts = [
    `score: ${candidate.score}`,
    `available/preferred members: ${candidate.reason.availableOrPreferredMembers}`,
    `available percentage bps: ${candidate.reason.availablePercentageBasisPoints}`,
    `required missing: ${candidate.requiredMembersMissing.length}`,
    `preferred members: ${candidate.preferredMembers.length}`,
    `maybe members: ${candidate.maybeMembers.length}`,
    `pending members: ${candidate.pendingMembers.length}`,
  ];

  if (candidate.reason.preferredDurationDelta !== undefined) {
    parts.push(`preferred duration delta: ${candidate.reason.preferredDurationDelta}`);
  }

  parts.push(`start date: ${candidate.startDate}`);
  return parts.join('; ');
}

function assertValidDateRange(range: DateRange): void {
  if (compareIsoDates(range.startDate, range.endDate) > 0) {
    throw new Error('Date range startDate must be before or equal to endDate.');
  }
}

function expandDateRange(range: DateRange): IsoDate[] {
  const start = parseIsoDate(range.startDate);
  const end = parseIsoDate(range.endDate);
  const duration = differenceInDaysInclusive(start, end);

  return Array.from({ length: duration }, (_, index) => toIsoDate(addDays(start, index)));
}

function parseIsoDate(value: IsoDate): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid ISO date: ${value}`);
  }

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (toIsoDate(date) !== value) {
    throw new Error(`Invalid calendar date: ${value}`);
  }

  return date;
}

function toIsoDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * millisecondsPerDay);
}

function differenceInDaysInclusive(start: Date, end: Date): number {
  return Math.trunc((end.getTime() - start.getTime()) / millisecondsPerDay) + 1;
}

function compareIsoDates(left: IsoDate, right: IsoDate): number {
  return parseIsoDate(left).getTime() - parseIsoDate(right).getTime();
}
