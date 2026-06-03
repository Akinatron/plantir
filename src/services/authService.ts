import * as Linking from 'expo-linking';

import { getSupabaseClient } from '../lib/supabase/client';
import { LoginFormValues, MagicLinkFormValues, SignupFormValues } from '../lib/validation/auth';

export async function signInWithPassword(values: LoginFormValues): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signUpWithPassword(values: SignupFormValues): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      data: {
        display_name: values.displayName,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendMagicLink(values: MagicLinkFormValues): Promise<void> {
  const supabase = getSupabaseClient();
  const redirectTo = Linking.createURL('/auth/callback');
  const { error } = await supabase.auth.signInWithOtp({
    email: values.email,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function exchangeCodeForSession(code: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    throw new Error(error.message);
  }
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}
