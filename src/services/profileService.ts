import { decode } from 'base64-arraybuffer';

import { getSupabaseClient } from '../lib/supabase/client';
import { ParsedProfileFormValues } from '../lib/validation/profile';
import { Profile, ProfileRow, mapProfileRow } from '../types/profile';

type EnsureProfileInput = {
  id: string;
  email?: string;
  displayName?: string;
};

type AvatarUploadInput = {
  userId: string;
  base64: string;
  contentType: string;
  fileExtension: string;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, display_name, username, avatar_url, timezone, locale, default_currency, created_at, updated_at',
    )
    .eq('id', userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapProfileRow(data) : null;
}

export async function ensureProfile(input: EnsureProfileInput): Promise<Profile> {
  const existing = await getProfile(input.id);

  if (existing) {
    return existing;
  }

  const fallbackName = input.displayName ?? input.email?.split('@')[0] ?? 'Plantir user';
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: input.id,
      display_name: fallbackName,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      locale: 'en',
      default_currency: 'EUR',
    })
    .select(
      'id, display_name, username, avatar_url, timezone, locale, default_currency, created_at, updated_at',
    )
    .single<ProfileRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapProfileRow(data);
}

export async function updateProfile(
  userId: string,
  values: ParsedProfileFormValues,
): Promise<Profile> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .update({
      display_name: values.displayName,
      avatar_url: values.avatarUrl,
      locale: values.locale,
      default_currency: values.defaultCurrency,
      timezone: values.timezone,
    })
    .eq('id', userId)
    .select(
      'id, display_name, username, avatar_url, timezone, locale, default_currency, created_at, updated_at',
    )
    .single<ProfileRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapProfileRow(data);
}

export async function uploadAvatar(input: AvatarUploadInput): Promise<string> {
  const supabase = getSupabaseClient();
  const normalizedExtension = input.fileExtension.replace('.', '').toLowerCase() || 'jpg';
  const path = `${input.userId}/avatar-${Date.now()}.${normalizedExtension}`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, decode(input.base64), {
      contentType: input.contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}
