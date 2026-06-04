import { z } from 'zod';

import { normalizeCurrencyCode, parseMoneyToCents } from '../algorithms/money';

const optionalUrlSchema = z
  .string()
  .trim()
  .transform((value) => normalizeOptionalUrl(value))
  .pipe(z.string().url('Use a valid URL.').nullable())
  .nullable();

const nullableNonNegativeNumberFromText = z
  .union([z.string(), z.number(), z.null()])
  .transform((value) => {
    if (value === null || value === '') {
      return null;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  })
  .pipe(z.number().nonnegative().nullable());

const nullableIntegerFromText = z
  .union([z.string(), z.number(), z.null()])
  .transform((value) => {
    if (value === null || value === '') {
      return null;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isInteger(parsed) ? parsed : Number.NaN;
  })
  .pipe(z.number().int().positive().nullable());

const nullableMoneyCentsFromText = z
  .string()
  .trim()
  .nullable()
  .transform((value) => {
    if (!value) {
      return null;
    }

    return parseMoneyToCents(value);
  });

export const destinationSetupSchema = z.object({
  tripId: z.string().uuid(),
});

export const destinationProposalSchema = z
  .object({
    tripId: z.string().uuid(),
    pollId: z.string().uuid(),
    title: z.string().trim().min(2, 'Title must be at least 2 characters.'),
    url: optionalUrlSchema,
    description: z.string().trim().nullable(),
    locationName: z.string().trim().nullable(),
    totalPriceCents: nullableMoneyCentsFromText,
    currencyCode: z
      .string()
      .trim()
      .nullable()
      .transform((value) => (value ? normalizeCurrencyCode(value) : null)),
    pricePerPersonCents: nullableMoneyCentsFromText,
    capacity: nullableIntegerFromText,
    bedrooms: nullableNonNegativeNumberFromText,
    bathrooms: nullableNonNegativeNumberFromText,
    pros: z.string().transform(splitLines),
    cons: z.string().transform(splitLines),
    imageBase64: z.string().nullable(),
    imageContentType: z.string().nullable(),
    imageFileExtension: z.string().nullable(),
  })
  .refine((value) => value.totalPriceCents === null || value.currencyCode !== null, {
    message: 'Currency is required when total price is set.',
    path: ['currencyCode'],
  })
  .refine((value) => value.pricePerPersonCents === null || value.currencyCode !== null, {
    message: 'Currency is required when price per person is set.',
    path: ['currencyCode'],
  });

export const destinationVoteSchema = z.object({
  tripId: z.string().uuid(),
  pollId: z.string().uuid(),
  proposalId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const closeDestinationPollSchema = z.object({
  pollId: z.string().uuid(),
  selectedProposalId: z.string().uuid().nullable(),
});

export const fetchLinkMetadataSchema = z.object({
  url: z
    .string()
    .trim()
    .transform((value) => normalizeOptionalUrl(value))
    .pipe(z.string().url()),
});

export type DestinationSetupFormValues = z.infer<typeof destinationSetupSchema>;
export type DestinationProposalFormValues = z.input<typeof destinationProposalSchema>;
export type ParsedDestinationProposalFormValues = z.output<typeof destinationProposalSchema>;
export type DestinationVoteFormValues = z.infer<typeof destinationVoteSchema>;
export type CloseDestinationPollFormValues = z.infer<typeof closeDestinationPollSchema>;

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeOptionalUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
