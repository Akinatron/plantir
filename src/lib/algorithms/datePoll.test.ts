import { getWinningDateRange, rankDatePollCandidates } from './datePoll';

const defaultWeights = {
  preferred: 4,
  available: 3,
  maybe: 1,
  unavailable: -4,
};

describe('date poll algorithm', () => {
  it('orders candidate date ranges by score and member availability', () => {
    const candidates = rankDatePollCandidates({
      allowedDateRanges: [{ startDate: '2026-07-01', endDate: '2026-07-03' }],
      minTripDays: 2,
      maxTripDays: 2,
      memberIds: ['a', 'b'],
      requiredMemberIds: ['a'],
      userAvailabilityRanges: [
        { userId: 'a', startDate: '2026-07-01', endDate: '2026-07-02', status: 'preferred' },
        { userId: 'b', startDate: '2026-07-01', endDate: '2026-07-02', status: 'available' },
        { userId: 'a', startDate: '2026-07-03', endDate: '2026-07-03', status: 'available' },
        { userId: 'b', startDate: '2026-07-03', endDate: '2026-07-03', status: 'maybe' },
      ],
      weights: defaultWeights,
      pendingPolicy: 'countAsUnavailable',
    });

    expect(candidates[0]).toMatchObject({
      startDate: '2026-07-01',
      endDate: '2026-07-02',
      durationDays: 2,
      preferredMembers: ['a'],
      availableMembers: ['b'],
      requiredMembersMissing: [],
      score: 7,
    });
  });

  it('tracks pending members according to pending policy', () => {
    const winner = getWinningDateRange({
      allowedDateRanges: [{ startDate: '2026-07-01', endDate: '2026-07-01' }],
      minTripDays: 1,
      maxTripDays: 1,
      memberIds: ['a', 'b'],
      requiredMemberIds: [],
      userAvailabilityRanges: [
        { userId: 'a', startDate: '2026-07-01', endDate: '2026-07-01', status: 'available' },
      ],
      weights: defaultWeights,
      pendingPolicy: 'countAsMaybe',
    });

    expect(winner?.pendingMembers).toEqual(['b']);
    expect(winner?.score).toBe(4);
  });

  it('marks required members missing unless they are available or preferred', () => {
    const winner = getWinningDateRange({
      allowedDateRanges: [{ startDate: '2026-07-01', endDate: '2026-07-01' }],
      minTripDays: 1,
      maxTripDays: 1,
      memberIds: ['a'],
      requiredMemberIds: ['a'],
      userAvailabilityRanges: [
        { userId: 'a', startDate: '2026-07-01', endDate: '2026-07-01', status: 'maybe' },
      ],
      weights: defaultWeights,
      pendingPolicy: 'ignore',
    });

    expect(winner?.maybeMembers).toEqual(['a']);
    expect(winner?.requiredMembersMissing).toEqual(['a']);
  });

  it('uses preferred duration as a deterministic tie-breaker', () => {
    const winner = getWinningDateRange({
      allowedDateRanges: [{ startDate: '2026-07-01', endDate: '2026-07-04' }],
      minTripDays: 1,
      maxTripDays: 3,
      preferredDurationDays: 2,
      memberIds: ['a'],
      requiredMemberIds: [],
      userAvailabilityRanges: [
        { userId: 'a', startDate: '2026-07-01', endDate: '2026-07-04', status: 'available' },
      ],
      weights: { preferred: 3, available: 3, maybe: 1, unavailable: -3 },
      pendingPolicy: 'ignore',
    });

    expect(winner?.durationDays).toBe(2);
    expect(winner?.rankReason).toContain('preferred duration delta: 0');
  });

  it('falls back to earliest start date when still tied', () => {
    const winner = getWinningDateRange({
      allowedDateRanges: [{ startDate: '2026-07-02', endDate: '2026-07-04' }],
      minTripDays: 1,
      maxTripDays: 1,
      memberIds: ['a'],
      requiredMemberIds: [],
      userAvailabilityRanges: [
        { userId: 'a', startDate: '2026-07-02', endDate: '2026-07-04', status: 'available' },
      ],
      weights: defaultWeights,
      pendingPolicy: 'ignore',
    });

    expect(winner?.startDate).toBe('2026-07-02');
  });

  it('rejects invalid calendar dates', () => {
    expect(() =>
      rankDatePollCandidates({
        allowedDateRanges: [{ startDate: '2026-02-30', endDate: '2026-03-01' }],
        minTripDays: 1,
        maxTripDays: 1,
        memberIds: [],
        requiredMemberIds: [],
        userAvailabilityRanges: [],
        weights: defaultWeights,
        pendingPolicy: 'ignore',
      }),
    ).toThrow('Invalid calendar date');
  });
});
