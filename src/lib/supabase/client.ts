/**
 * Cliente Supabase para Expo.
 *
 * Usa `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` desde
 * variables de entorno. En desarrollo, normalmente apuntan al stack
 * local (`http://localhost:54321` y su anon key).
 *
 * Decisión: NO usamos persist session por defecto en cliente para forzar
 * el flujo de Supabase Auth con SecureStore (Keychain/Keystore). Esto
 * es crítico para cumplir OWASP M3 (Insecure auth/authorization).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import type { Database } from './database.types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Adapter para `expo-secure-store` (Keychain en iOS, EncryptedSharedPreferences
 * en Android). Cumple OWASP M9 (Insecure data storage).
 */
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // ignore storage errors (cuota, etc.)
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
  },
};

export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'plantir-mobile/0.1.0',
      },
    },
  },
);
