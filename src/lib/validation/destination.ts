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

const customFieldValueSchema = z
  .object({
    fieldId: z.string().uuid(),
    valueText: z.string().trim().nullable().optional(),
    valueNumber: z.union([z.string(), z.number(), z.null()]).optional(),
    valueMoneyCents: z.union([z.string(), z.number(), z.null()]).optional(),
    valueBoolean: z.boolean().nullable().optional(),
    valueUrl: z
      .string()
      .trim()
      .nullable()
      .optional()
      .transform((value) => (value === undefined ? null : normalizeOptionalUrl(value))),
  })
  .transform((value) => ({
    fieldId: value.fieldId,
    valueText: normalizeOptionalText(value.valueText),
    valueNumber: parseOptionalNumber(value.valueNumber),
    valueMoneyCents: parseOptionalMoney(value.valueMoneyCents),
    valueBoolean: value.valueBoolean ?? null,
    valueUrl: value.valueUrl ?? null,
  }))
  .refine((value) => value.valueUrl === null || z.string().url().safeParse(value.valueUrl).success, {
    message: 'Custom URL value must be a valid URL.',
    path: ['valueUrl'],
  })
  .refine(
    (value) =>
      [
        value.valueText,
        value.valueNumber,
        value.valueMoneyCents,
        value.valueBoolean,
        value.valueUrl,
      ].filter((item) => item !== null).length <= 1,
    {
      message: 'Custom field values can set only one typed value.',
    },
  );

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
    customFieldValues: z.array(customFieldValueSchema).optional().default([]),
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

export const destinationCustomFieldSchema = z.object({
  tripId: z.string().uuid(),
  pollId: z.string().uuid().nullable(),
  name: z.string().trim().min(1, 'Field name is required.'),
  emoji: z.string().trim().nullable(),
  fieldType: z.enum(['text', 'number', 'money', 'boolean', 'url']),
  showOnCard: z.boolean(),
  required: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
});

export const updateDestinationCustomFieldSchema = destinationCustomFieldSchema.extend({
  id: z.string().uuid(),
});

export const upsertDestinationCustomFieldValuesSchema = z.object({
  proposalId: z.string().uuid(),
  values: z.array(customFieldValueSchema),
});

export type DestinationSetupFormValues = z.infer<typeof destinationSetupSchema>;
export type DestinationProposalFormValues = z.input<typeof destinationProposalSchema>;
export type ParsedDestinationProposalFormValues = z.output<typeof destinationProposalSchema>;
export type DestinationVoteFormValues = z.infer<typeof destinationVoteSchema>;
export type CloseDestinationPollFormValues = z.infer<typeof closeDestinationPollSchema>;
export type DestinationCustomFieldFormValues = z.infer<typeof destinationCustomFieldSchema>;
export type UpdateDestinationCustomFieldFormValues = z.infer<typeof updateDestinationCustomFieldSchema>;
export type UpsertDestinationCustomFieldValuesFormValues = z.input<
  typeof upsertDestinationCustomFieldValuesSchema
>;
export type ParsedUpsertDestinationCustomFieldValuesFormValues = z.output<
  typeof upsertDestinationCustomFieldValuesSchema
>;

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

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseOptionalNumber(value: string | number | null | undefined): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error('Custom number value must be numeric.');
  }

  return parsed;
}

function parseOptionalMoney(value: string | number | null | undefined): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return typeof value === 'number' ? value : parseMoneyToCents(value);
}
