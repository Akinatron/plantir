import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export const signupSchema = z.object({
  displayName: z.string().trim().min(2, 'Display name must be at least 2 characters.'),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export const magicLinkSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;
export type MagicLinkFormValues = z.infer<typeof magicLinkSchema>;
