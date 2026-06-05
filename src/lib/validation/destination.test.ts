import {
  destinationCustomFieldSchema,
  destinationProposalSchema,
  destinationVoteSchema,
  upsertDestinationCustomFieldValuesSchema,
} from './destination';

describe('destination validation', () => {
  const tripId = '11111111-1111-4111-8111-111111111111';
  const pollId = '22222222-2222-4222-8222-222222222222';
  const proposalId = '33333333-3333-4333-8333-333333333333';
  const userId = '44444444-4444-4444-8444-444444444444';

  it('normalizes proposal money, currency, pros, and cons', () => {
    expect(
      destinationProposalSchema.parse({
        tripId,
        pollId,
        title: 'Beach house',
        url: 'https://example.com/house',
        description: 'Near the sea',
        locationName: 'Valencia',
        totalPriceCents: '1200.50',
        currencyCode: 'eur',
        pricePerPersonCents: '150.25',
        capacity: '8',
        bedrooms: '4',
        bathrooms: '2.5',
        pros: 'Pool\nClose to beach',
        cons: 'No parking,Small kitchen',
        imageBase64: null,
        imageContentType: null,
        imageFileExtension: null,
      }),
    ).toMatchObject({
      totalPriceCents: 120050,
      currencyCode: 'EUR',
      pricePerPersonCents: 15025,
      capacity: 8,
      pros: ['Pool', 'Close to beach'],
      cons: ['No parking', 'Small kitchen'],
    });
  });

  it('accepts common URL and money input formats', () => {
    expect(
      destinationProposalSchema.parse({
        tripId,
        pollId,
        title: 'Hotel',
        url: 'www.booking.com',
        description: null,
        locationName: null,
        totalPriceCents: '542',
        currencyCode: 'eur',
        pricePerPersonCents: '52,40',
        capacity: '2',
        bedrooms: null,
        bathrooms: null,
        pros: '',
        cons: '',
        imageBase64: null,
        imageContentType: null,
        imageFileExtension: null,
      }),
    ).toMatchObject({
      url: 'https://www.booking.com',
      totalPriceCents: 54200,
      pricePerPersonCents: 5240,
    });
  });

  it('requires currency when a price is set', () => {
    expect(() =>
      destinationProposalSchema.parse({
        tripId,
        pollId,
        title: 'Beach house',
        url: null,
        description: null,
        locationName: null,
        totalPriceCents: '1200.50',
        currencyCode: null,
        pricePerPersonCents: null,
        capacity: null,
        bedrooms: null,
        bathrooms: null,
        pros: '',
        cons: '',
        imageBase64: null,
        imageContentType: null,
        imageFileExtension: null,
      }),
    ).toThrow('Currency is required');
  });

  it('accepts a single-choice destination vote', () => {
    expect(
      destinationVoteSchema.parse({
        tripId,
        pollId,
        proposalId,
        userId,
      }),
    ).toMatchObject({ proposalId });
  });

  it('accepts configured place custom fields', () => {
    expect(
      destinationCustomFieldSchema.parse({
        tripId,
        pollId,
        name: 'Pool',
        emoji: 'P',
        fieldType: 'boolean',
        showOnCard: true,
        required: false,
        sortOrder: 2,
      }),
    ).toMatchObject({
      name: 'Pool',
      fieldType: 'boolean',
      showOnCard: true,
    });
  });

  it('normalizes custom field values and rejects mixed typed values', () => {
    expect(
      upsertDestinationCustomFieldValuesSchema.parse({
        proposalId,
        values: [
          {
            fieldId: '55555555-5555-4555-8555-555555555555',
            valueUrl: 'booking.com/hotel',
          },
        ],
      }),
    ).toMatchObject({
      values: [{ valueUrl: 'https://booking.com/hotel' }],
    });

    expect(() =>
      upsertDestinationCustomFieldValuesSchema.parse({
        proposalId,
        values: [
          {
            fieldId: '55555555-5555-4555-8555-555555555555',
            valueText: 'Sea view',
            valueNumber: 4,
          },
        ],
      }),
    ).toThrow('Custom field values can set only one typed value.');
  });
});
