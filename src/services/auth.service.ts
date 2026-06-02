/**
 * Servicio de autenticación.
 *
 * Wrapper sobre Supabase Auth con `ServiceResult<T>` consistente.
 * Estrategia: signup con magic link (email) + signin con email/password.
 *
 * Decisión: NO usamos OAuth social en MVP (Apple/Google) por simplicidad
 * y porque el magic link da fricción cero al usuario. OAuth queda en v1.
 */

import { supabase } from '@/lib/supabase/client';
import { ok, fail, fromSupabaseError } from '@/lib/service-result';
import type { ServiceResult, ServiceError } from '@/lib/service-result';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@/types';

export const authService = {
  /**
   * Signup con email + password + metadata del perfil.
   * Devuelve el `user` creado (puede requerir confirmar email).
   */
  async signUp(input: {
    email: string;
    password: string;
    displayName: string;
    locale?: string;
    defaultCurrency?: string;
    timezone?: string;
  }): Promise<ServiceResult<{ user: User; session: Session | null }>> {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          display_name: input.displayName,
          locale: input.locale ?? 'es-ES',
          default_currency: input.defaultCurrency ?? 'EUR',
          timezone: input.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
    });
    if (error) return fail(fromSupabaseError(error));
    if (!data.user) return fail({ code: 'unknown', message: 'No se creó el usuario' });
    return ok({ user: data.user, session: data.session });
  },

  /**
   * Login con email + password.
   */
  async signIn(input: {
    email: string;
    password: string;
  }): Promise<ServiceResult<{ user: User; session: Session }>> {
    const { data, error } = await supabase.auth.signInWithPassword(input);
    if (error) return fail(fromSupabaseError(error));
    if (!data.user || !data.session) {
      return fail({ code: 'unknown', message: 'No se devolvió sesión' });
    }
    return ok({ user: data.user, session: data.session });
  },

  /**
   * Magic link login (passwordless).
   */
  async sendMagicLink(email: string): Promise<ServiceResult<null>> {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) return fail(fromSupabaseError(error));
    return ok(null);
  },

  /**
   * Logout.
   */
  async signOut(): Promise<ServiceResult<null>> {
    const { error } = await supabase.auth.signOut();
    if (error) return fail(fromSupabaseError(error));
    return ok(null);
  },

  /**
   * Refresh de la sesión actual (lo llama el cliente Supabase periódicamente).
   */
  async refreshSession(): Promise<ServiceResult<{ session: Session | null }>> {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) return fail(fromSupabaseError(error));
    return ok({ session: data.session });
  },

  /**
   * Reset password via email.
   */
  async resetPassword(email: string): Promise<ServiceResult<null>> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return fail(fromSupabaseError(error));
    return ok(null);
  },

  /**
   * Carga el perfil del usuario actual desde la tabla `profiles`.
   * El trigger `handle_new_user` lo crea en el signup, así que debería existir.
   */
  async getProfile(userId: string): Promise<ServiceResult<Profile>> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) return fail(fromSupabaseError(error));
    if (!data) return fail({ code: 'not_found', message: 'Perfil no encontrado' });
    return ok(data as Profile);
  },

  /**
   * Actualiza el perfil del usuario actual.
   */
  async updateProfile(input: Partial<Profile>): Promise<ServiceResult<Profile>> {
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) return fail({ code: 'unauthorized', message: 'No autenticado' });
    const { data, error } = await supabase
      .from('profiles')
      .update(input)
      .eq('id', session.user.id)
      .select()
      .single();
    if (error) return fail(fromSupabaseError(error));
    return ok(data as Profile);
  },
};

export type AuthServiceError = ServiceError;
