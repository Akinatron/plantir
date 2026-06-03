import { z } from 'zod';

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Display name must be at least 2 characters.'),
  locale: z.string().trim().min(2, 'Locale is required.'),
  defaultCurrency: z
    .string()
    .trim()
    .length(3, 'Currency must use a 3-letter ISO code.')
    .transform((value) => value.toUpperCase()),
  timezone: z.string().trim().min(1, 'Timezone is required.'),
  avatarUrl: z.string().nullable(),
});

export type ProfileFormValues = z.input<typeof profileSchema>;
export type ParsedProfileFormValues = z.output<typeof profileSchema>;
