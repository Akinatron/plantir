import { datePollSetupSchema, datePollVoteSchema } from './datePoll';

describe('date poll validation', () => {
  const tripId = '11111111-1111-4111-8111-111111111111';
  const userId = '22222222-2222-4222-8222-222222222222';
  const pollId = '33333333-3333-4333-8333-333333333333';

  it('accepts practical setup values', () => {
    expect(
      datePollSetupSchema.parse({
        tripId,
        allowedStartDate: '2026-07-01',
        allowedEndDate: '2026-07-10',
        minTripDays: 2,
        maxTripDays: 4,
        preferredDurationDays: 3,
        votingDeadlineAt: '2026-06-25T12:00:00.000Z',
        requiredMemberIds: [userId],
      }),
    ).toMatchObject({
      minTripDays: 2,
      maxTripDays: 4,
      preferredDurationDays: 3,
    });
  });

  it('rejects max trip days below min trip days', () => {
    expect(() =>
      datePollSetupSchema.parse({
        tripId,
        allowedStartDate: '2026-07-01',
        allowedEndDate: '2026-07-10',
        minTripDays: 5,
        maxTripDays: 4,
        preferredDurationDays: null,
        votingDeadlineAt: null,
        requiredMemberIds: [],
      }),
    ).toThrow('Max trip days must be greater than or equal to min trip days.');
  });

  it('rejects reversed allowed date windows', () => {
    expect(() =>
      datePollSetupSchema.parse({
        tripId,
        allowedStartDate: '2026-07-10',
        allowedEndDate: '2026-07-01',
        minTripDays: 2,
        maxTripDays: 4,
        preferredDurationDays: null,
        votingDeadlineAt: null,
        requiredMemberIds: [],
      }),
    ).toThrow('Allowed end date must be on or after start date.');
  });

  it('accepts explicit day-level vote statuses', () => {
    expect(
      datePollVoteSchema.parse({
        pollId,
        userId,
        votes: {
          '2026-07-01': 'preferred',
          '2026-07-02': 'available',
          '2026-07-03': 'maybe',
          '2026-07-04': 'unavailable',
        },
      }),
    ).toMatchObject({
      votes: {
        '2026-07-04': 'unavailable',
      },
    });
  });
});
