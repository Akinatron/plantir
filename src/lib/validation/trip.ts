import { z } from 'zod';

export const createTripSchema = z
  .object({
    title: z.string().trim().min(2, 'Trip title must be at least 2 characters.'),
    description: z.string().trim().optional(),
    timezone: z.string().trim().min(1, 'Timezone is required.'),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.').nullable(),
    endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.').nullable(),
  })
  .refine((value) => !value.startsOn || !value.endsOn || value.startsOn <= value.endsOn, {
    message: 'End date must be on or after start date.',
    path: ['endsOn'],
  });

export const tripSettingsSchema = z.object({
  title: z.string().trim().min(2, 'Trip title must be at least 2 characters.'),
  description: z.string().trim().nullable(),
  timezone: z.string().trim().min(1, 'Timezone is required.'),
  memberCanCreateProposals: z.boolean(),
  memberCanCreateExpenses: z.boolean(),
});

export const createInviteSchema = z
  .object({
    tripId: z.string().uuid(),
    expiresAt: z.string().datetime().nullable(),
    maxUses: z.number().int().positive().nullable(),
  })
  .refine((value) => value.expiresAt !== null || value.maxUses !== null, {
    message: 'Set an expiration time, max uses, or both.',
  });

export type CreateTripFormValues = z.infer<typeof createTripSchema>;
export type TripSettingsFormValues = z.infer<typeof tripSettingsSchema>;
export type CreateInviteFormValues = z.infer<typeof createInviteSchema>;
