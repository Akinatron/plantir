/**
 * Servicio de miembros del viaje.
 */

import { supabase } from '@/lib/supabase/client';
import { ok, fail, fromSupabaseError } from '@/lib/service-result';
import type { ServiceResult } from '@/lib/service-result';
import type { TripMember, TripId, UserId, TripRole } from '@/types';

export const membersService = {
  async list(tripId: TripId): Promise<ServiceResult<TripMember[]>> {
    const { data, error } = await supabase
      .from('trip_members')
      .select('*')
      .eq('trip_id', tripId)
      .order('joined_at', { ascending: true });
    if (error) return fail(fromSupabaseError(error));
    return ok((data ?? []) as TripMember[]);
  },

  async updateRole(
    tripId: TripId,
    memberUserId: UserId,
    role: TripRole,
  ): Promise<ServiceResult<TripMember>> {
    const { data, error } = await supabase
      .from('trip_members')
      .update({ role })
      .eq('trip_id', tripId)
      .eq('user_id', memberUserId)
      .select()
      .single();
    if (error) return fail(fromSupabaseError(error));
    return ok(data as TripMember);
  },

  async leave(tripId: TripId): Promise<ServiceResult<null>> {
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) return fail({ code: 'unauthorized', message: 'No autenticado' });
    const { error } = await supabase
      .from('trip_members')
      .update({ left_at: new Date().toISOString() })
      .eq('trip_id', tripId)
      .eq('user_id', session.user.id);
    if (error) return fail(fromSupabaseError(error));
    return ok(null);
  },

  async remove(tripId: TripId, memberUserId: UserId): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from('trip_members')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', memberUserId);
    if (error) return fail(fromSupabaseError(error));
    return ok(null);
  },
};
