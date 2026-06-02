/**
 * Servicio de invitaciones.
 *
 * La creación del invite pasa por Edge Function `create-trip-invite` (genera
 * el token de forma segura y guarda solo el hash). La aceptación también
 * via Edge Function.
 */

import { supabase } from '@/lib/supabase/client';
import { ok, fail, fromSupabaseError } from '@/lib/service-result';
import type { ServiceResult } from '@/lib/service-result';
import type { TripInvite, TripId } from '@/types';

export const invitesService = {
  async list(tripId: TripId): Promise<ServiceResult<TripInvite[]>> {
    const { data, error } = await supabase
      .from('trip_invites')
      .select('*')
      .eq('trip_id', tripId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });
    if (error) return fail(fromSupabaseError(error));
    return ok((data ?? []) as TripInvite[]);
  },

  /**
   * Crea un invite via Edge Function. La Edge Function genera el token
   * seguro y devuelve el `invite_url` completo con el token en claro
   * (NUNCA más se puede recuperar, solo el hash queda en DB).
   */
  async create(input: {
    tripId: TripId;
    expiresAt?: string;
    maxUses?: number;
    requireApproval?: boolean;
  }): Promise<ServiceResult<{ inviteUrl: string; expiresAt: string }>> {
    const { data, error } = await supabase.functions.invoke('create-trip-invite', {
      body: input,
    });
    if (error) return fail(fromSupabaseError(error));
    if (!data) return fail({ code: 'unknown', message: 'Sin respuesta del servidor' });
    return ok(data as { inviteUrl: string; expiresAt: string });
  },

  /**
   * Acepta un invite via Edge Function. Devuelve el tripId para navegar.
   */
  async accept(token: string): Promise<ServiceResult<{ tripId: string }>> {
    const { data, error } = await supabase.functions.invoke('accept-trip-invite', {
      body: { token },
    });
    if (error) return fail(fromSupabaseError(error));
    if (!data) return fail({ code: 'unknown', message: 'Sin respuesta del servidor' });
    return ok(data as { tripId: string });
  },

  async revoke(inviteId: string): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from('trip_invites')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', inviteId);
    if (error) return fail(fromSupabaseError(error));
    return ok(null);
  },
};
