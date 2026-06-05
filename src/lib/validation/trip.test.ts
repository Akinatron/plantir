import { createInviteSchema, createTripSchema, tripSettingsSchema } from './trip';

describe('trip validation', () => {
  it('accepts a practical trip draft with optional dates', () => {
    expect(
      createTripSchema.parse({
        title: 'Lisbon weekend',
        description: 'House trip',
        timezone: 'Europe/Madrid',
        startsOn: null,
        endsOn: null,
      }),
    ).toMatchObject({
      title: 'Lisbon weekend',
      timezone: 'Europe/Madrid',
    });
  });

  it('rejects a trip end date before the start date', () => {
    expect(() =>
      createTripSchema.parse({
        title: 'Lisbon weekend',
        description: '',
        timezone: 'Europe/Madrid',
        startsOn: '2026-08-10',
        endsOn: '2026-08-09',
      }),
    ).toThrow('End date must be on or after start date.');
  });

  it('requires invite expiration, max uses, or both', () => {
    expect(() =>
      createInviteSchema.parse({
        tripId: '11111111-1111-4111-8111-111111111111',
        expiresAt: null,
        maxUses: null,
      }),
    ).toThrow('Set an expiration time, max uses, or both.');
  });

  it('accepts invite settings with both expiration and max uses', () => {
    expect(
      createInviteSchema.parse({
        tripId: '11111111-1111-4111-8111-111111111111',
        expiresAt: '2026-08-10T10:00:00.000Z',
        maxUses: 12,
      }),
    ).toMatchObject({ maxUses: 12 });
  });

  it('keeps member capability settings explicit', () => {
    expect(
      tripSettingsSchema.parse({
        title: 'Lisbon weekend',
        description: null,
        timezone: 'Europe/Madrid',
        memberCanCreateProposals: false,
        memberCanCreateExpenses: true,
        memberCanSeeDateResults: true,
        memberCanSeePlaceResults: false,
        memberCanModifyPlaceFields: true,
        settlementMarkPaidPolicy: 'owner_admin_only',
      }),
    ).toMatchObject({
      memberCanCreateProposals: false,
      memberCanCreateExpenses: true,
      memberCanSeeDateResults: true,
      memberCanSeePlaceResults: false,
      memberCanModifyPlaceFields: true,
      settlementMarkPaidPolicy: 'owner_admin_only',
    });
  });
});
