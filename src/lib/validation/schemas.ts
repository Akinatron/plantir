/**
 * Esquemas Zod compartidos cliente/servidor.
 *
 * Estos schemas se usan en:
 *  - Formularios (React Hook Form + zodResolver).
 *  - Validación antes de enviar al backend.
 *  - Re-exports desde Edge Functions para validación server-side.
 *
 * El cliente SIEMPRE valida antes de enviar. El backend SIEMPRE revalida.
 * (Defense in depth — nunca confíes en el cliente.)
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Atómicos reusables
// ─────────────────────────────────────────────────────────────────────────────

export const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe ser YYYY-MM-DD');

export const isoDateTimeString = z
  .string()
  .datetime({ message: 'Debe ser ISO 8601 con timezone' });

export const cents = z.number().int().nonnegative();

export const positiveCents = z.number().int().positive();

export const currencyCode = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/, 'Código ISO 4217 de 3 letras mayúsculas');

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export const signUpSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(60),
  locale: z.string().default('es-ES'),
  defaultCurrency: currencyCode.default('EUR'),
  timezone: z.string().default('Europe/Madrid'),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
export type SignInInput = z.infer<typeof signInSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Trip
// ─────────────────────────────────────────────────────────────────────────────

export const createTripSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  currency: currencyCode.default('EUR'),
  coverImagePath: z.string().optional().nullable(),
});
export type CreateTripInput = z.infer<typeof createTripSchema>;

export const updateTripSchema = createTripSchema.partial();
export type UpdateTripInput = z.infer<typeof updateTripSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Invites
// ─────────────────────────────────────────────────────────────────────────────

export const createInviteSchema = z.object({
  tripId: z.string().uuid(),
  expiresAt: isoDateTimeString.optional(),
  maxUses: z.number().int().positive().max(1000).optional(),
  requireApproval: z.boolean().default(false),
});
export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().min(20),
});
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Polls
// ─────────────────────────────────────────────────────────────────────────────

export const datePollSetupSchema = z.object({
  tripId: z.string().uuid(),
  type: z.enum(['calendar', 'range_proposals', 'flexible', 'fixed']),
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  allowedRanges: z
    .array(
      z.object({
        start: isoDateString,
        end: isoDateString,
      }),
    )
    .min(1),
  minTripDays: z.number().int().min(1).default(2),
  maxTripDays: z.number().int().min(1).default(14),
  votingDeadline: isoDateTimeString.optional(),
});
export type DatePollSetupInput = z.infer<typeof datePollSetupSchema>;

export const dateVoteSchema = z.object({
  pollId: z.string().uuid(),
  ranges: z
    .array(
      z.object({
        start: isoDateString,
        end: isoDateString,
        availability: z.enum(['available', 'prefer', 'maybe', 'unavailable']),
      }),
    )
    .min(1),
});
export type DateVoteInput = z.infer<typeof dateVoteSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Expenses
// ─────────────────────────────────────────────────────────────────────────────

export const splitTypeSchema = z.enum(['equal', 'amount', 'percentage', 'shares', 'exclude']);

export const expenseSplitSchema = z
  .object({
    memberId: z.string().uuid(),
    splitType: splitTypeSchema,
    amountCents: cents.optional(),
    percentage: z.number().min(0).max(100).optional(),
    shares: z.number().positive().optional(),
    included: z.boolean().default(true),
  })
  .refine(
    (s) => {
      // Si es amount, el amountCents es obligatorio.
      if (s.splitType === 'amount') return s.amountCents !== undefined;
      // Si es percentage, el percentage es obligatorio.
      if (s.splitType === 'percentage') return s.percentage !== undefined;
      // Si es shares, el shares es obligatorio.
      if (s.splitType === 'shares') return s.shares !== undefined;
      return true;
    },
    { message: 'Faltan campos requeridos para este tipo de split' },
  );
export type ExpenseSplitInput = z.infer<typeof expenseSplitSchema>;

export const expensePayerSchema = z.object({
  memberId: z.string().uuid(),
  amountCents: positiveCents,
});
export type ExpensePayerInput = z.infer<typeof expensePayerSchema>;

export const createExpenseSchema = z
  .object({
    tripId: z.string().uuid(),
    title: z.string().min(1).max(120),
    description: z.string().max(500).optional().nullable(),
    category: z.enum([
      'lodging',
      'food',
      'transport',
      'activities',
      'shopping',
      'other',
    ]),
    type: z.enum(['expense', 'income']),
    amountCents: positiveCents,
    currency: currencyCode,
    paidAt: isoDateString.optional(),
    payers: z.array(expensePayerSchema).min(1),
    splits: z.array(expenseSplitSchema).min(1),
    receiptStoragePath: z.string().optional().nullable(),
  })
  .refine(
    (e) => e.payers.reduce((acc, p) => acc + p.amountCents, 0) >= e.amountCents,
    {
      message: 'La suma de payers debe cubrir al menos el monto total',
      path: ['payers'],
    },
  );
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Settlements
// ─────────────────────────────────────────────────────────────────────────────

export const markSettlementPaidSchema = z.object({
  settlementId: z.string().uuid().optional(),
  fromMemberId: z.string().uuid(),
  toMemberId: z.string().uuid(),
  amountCents: positiveCents,
  currency: currencyCode,
  note: z.string().max(200).optional().nullable(),
});
export type MarkSettlementPaidInput = z.infer<typeof markSettlementPaidSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Link metadata
// ─────────────────────────────────────────────────────────────────────────────

export const fetchLinkMetadataSchema = z.object({
  url: z.string().url().max(2000),
});
export type FetchLinkMetadataInput = z.infer<typeof fetchLinkMetadataSchema>;
