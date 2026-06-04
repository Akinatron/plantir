import { z } from 'zod';

import { normalizeCurrencyCode, parseMoneyToCents } from '../algorithms/money';

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');

export const createExpenseSchema = z.object({
  tripId: z.string().uuid(),
  createdBy: z.string().uuid(),
  title: z.string().trim().min(2, 'Title must be at least 2 characters.'),
  description: z.string().trim().nullable(),
  category: z.string().trim().nullable(),
  amountCents: z
    .string()
    .trim()
    .min(1, 'Amount is required.')
    .transform((value) => parseMoneyToCents(value)),
  currencyCode: z
    .string()
    .trim()
    .length(3, 'Currency must use a 3-letter code.')
    .transform((value) => normalizeCurrencyCode(value)),
  paidByUserId: z.string().uuid(),
  participantIds: z.array(z.string().uuid()),
  excludedUserIds: z.array(z.string().uuid()),
  expenseDate: isoDateSchema,
});

export const computeTripBalancesSchema = z.object({
  tripId: z.string().uuid(),
});

export const markSettlementPaidSchema = z.object({
  suggestionId: z.string().uuid(),
});

export type CreateExpenseFormValues = z.input<typeof createExpenseSchema>;
export type ParsedCreateExpenseFormValues = z.output<typeof createExpenseSchema>;
export type ComputeTripBalancesFormValues = z.infer<typeof computeTripBalancesSchema>;
export type MarkSettlementPaidFormValues = z.infer<typeof markSettlementPaidSchema>;
