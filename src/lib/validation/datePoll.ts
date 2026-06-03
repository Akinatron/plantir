import { z } from 'zod';

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');

export const datePollSetupSchema = z
  .object({
    tripId: z.string().uuid(),
    allowedStartDate: isoDateSchema,
    allowedEndDate: isoDateSchema,
    minTripDays: z.number().int().positive(),
    maxTripDays: z.number().int().positive(),
    preferredDurationDays: z.number().int().positive().nullable(),
    votingDeadlineAt: z.string().datetime().nullable(),
    requiredMemberIds: z.array(z.string().uuid()),
  })
  .refine((value) => value.allowedStartDate <= value.allowedEndDate, {
    message: 'Allowed end date must be on or after start date.',
    path: ['allowedEndDate'],
  })
  .refine((value) => value.maxTripDays >= value.minTripDays, {
    message: 'Max trip days must be greater than or equal to min trip days.',
    path: ['maxTripDays'],
  });

export const datePollVoteStatusSchema = z.enum(['preferred', 'available', 'maybe', 'unavailable']);

export const datePollVoteSchema = z.object({
  pollId: z.string().uuid(),
  userId: z.string().uuid(),
  votes: z.record(isoDateSchema, datePollVoteStatusSchema),
});

export type DatePollSetupFormValues = z.infer<typeof datePollSetupSchema>;
export type DatePollVoteFormValues = z.infer<typeof datePollVoteSchema>;
