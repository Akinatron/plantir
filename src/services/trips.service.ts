/**
 * Servicio de viajes (trips).
 *
 * CRUD básico + queries derivadas:
 *  - getById
 *  - list (del usuario actual, via RLS)
 *  - create (creator se autoañade como owner via trigger)
 *  - update
 *  - archive (soft delete)
 */

import { supabase } from '@/lib/supabase/client';
import { ok, fail, fromSupabaseError } from '@/lib/service-result';
import type { ServiceResult } from '@/lib/service-result';
import type { Trip, TripId, UserId, CreateTripInput } from '@/types';

export const tripsService = {
  async getById(tripId: TripId): Promise<ServiceResult<Trip>> {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .maybeSingle();
    if (error) return fail(fromSupabaseError(error));
    if (!data) return fail({ code: 'not_found', message: 'Viaje no encontrado' });
    return ok(data as Trip);
  },

  async list(): Promise<ServiceResult<Trip[]>> {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .is('archived_at', null)
      .order('updated_at', { ascending: false });
    if (error) return fail(fromSupabaseError(error));
    return ok((data ?? []) as Trip[]);
  },

  async listForUser(userId: UserId): Promise<ServiceResult<Trip[]>> {
    // Esta query hace JOIN con trip_members para filtrar por userId via RLS.
    // Como RLS ya filtra, la query base es la misma que list().
    return this.list();
  },

  async create(input: CreateTripInput): Promise<ServiceResult<Trip>> {
    const { data, error } = await supabase
      .from('trips')
      .insert({
        name: input.name,
        description: input.description ?? null,
        currency: input.currency,
        cover_image_path: input.coverImagePath ?? null,
      })
      .select()
      .single();
    if (error) return fail(fromSupabaseError(error));
    return ok(data as Trip);
  },

  async update(tripId: TripId, input: Partial<CreateTripInput>): Promise<ServiceResult<Trip>> {
    const { data, error } = await supabase
      .from('trips')
      .update({
        name: input.name,
        description: input.description,
        currency: input.currency,
        cover_image_path: input.coverImagePath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tripId)
      .select()
      .single();
    if (error) return fail(fromSupabaseError(error));
    return ok(data as Trip);
  },

  async archive(tripId: TripId): Promise<ServiceResult<Trip>> {
    const { data, error } = await supabase
      .from('trips')
      .update({
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tripId)
      .select()
      .single();
    if (error) return fail(fromSupabaseError(error));
    return ok(data as Trip);
  },
};
