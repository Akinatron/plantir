/**
 * Servicio de Supabase Storage.
 *
 * Maneja uploads de imágenes (avatars, trip covers, proposal images,
 * receipts) y genera URLs públicas/pre-firmadas según la policy.
 */

import { supabase } from '@/lib/supabase/client';
import { ok, fail, fromSupabaseError } from '@/lib/service-result';
import type { ServiceResult } from '@/lib/service-result';

const BUCKETS = {
  AVATARS: 'avatars',
  TRIP_COVERS: 'trip-covers',
  PROPOSAL_IMAGES: 'proposal-images',
  RECEIPTS: 'receipts',
} as const;

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_RECEIPT_MIMES = [...ALLOWED_MIMES, 'application/pdf'];

export const storageService = {
  /**
   * Sube un avatar. Path: `avatars/{user_id}/avatar.{ext}`.
   * Sobrescribe si ya existe (un solo avatar por user).
   */
  async uploadAvatar(
    userId: string,
    file: { uri: string; mimeType: string; size: number },
  ): Promise<ServiceResult<{ path: string; url: string }>> {
    return this._upload(BUCKETS.AVATARS, `${userId}/avatar`, file, ALLOWED_MIMES);
  },

  async uploadTripCover(
    tripId: string,
    file: { uri: string; mimeType: string; size: number },
  ): Promise<ServiceResult<{ path: string; url: string }>> {
    return this._upload(BUCKETS.TRIP_COVERS, `${tripId}/cover`, file, ALLOWED_MIMES);
  },

  async uploadProposalImage(
    tripId: string,
    proposalId: string,
    file: { uri: string; mimeType: string; size: number },
  ): Promise<ServiceResult<{ path: string; url: string }>> {
    return this._upload(
      BUCKETS.PROPOSAL_IMAGES,
      `${tripId}/${proposalId}/${Date.now()}`,
      file,
      ALLOWED_MIMES,
    );
  },

  async uploadReceipt(
    tripId: string,
    expenseId: string,
    file: { uri: string; mimeType: string; size: number },
  ): Promise<ServiceResult<{ path: string; url: string }>> {
    return this._upload(
      BUCKETS.RECEIPTS,
      `${tripId}/${expenseId}/${Date.now()}`,
      file,
      ALLOWED_RECEIPT_MIMES,
    );
  },

  async delete(bucket: string, path: string): Promise<ServiceResult<null>> {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) return fail(fromSupabaseError(error));
    return ok(null);
  },

  /**
   * Genera una URL firmada de duración limitada para descargar un archivo
   * privado. Si el bucket fuera público, se podría usar `getPublicUrl`.
   */
  async getSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600,
  ): Promise<ServiceResult<string>> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    if (error) return fail(fromSupabaseError(error));
    if (!data) return fail({ code: 'not_found', message: 'Archivo no encontrado' });
    return ok(data.signedUrl);
  },

  // ─── Privado ─────────────────────────────────────────────────────────────

  async _upload(
    bucket: string,
    pathPrefix: string,
    file: { uri: string; mimeType: string; size: number },
    allowedMimes: string[],
  ): Promise<ServiceResult<{ path: string; url: string }>> {
    if (file.size > MAX_SIZE) {
      return fail({ code: 'validation', message: 'Archivo demasiado grande (máx 5 MB)' });
    }
    if (!allowedMimes.includes(file.mimeType)) {
      return fail({ code: 'validation', message: `Tipo de archivo no permitido: ${file.mimeType}` });
    }
    const ext = this._extFromMime(file.mimeType);
    const path = `${pathPrefix}.${ext}`;
    // En RN, `fetch(uri).then(r => r.blob())` es el patrón estándar para
    // obtener el Blob desde una uri local. Aquí lo dejamos como string uri
    // porque la implementación concreta depende de la versión de Expo.
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file.uri as unknown as Blob, {
        contentType: file.mimeType,
        upsert: true,
      });
    if (error) return fail(fromSupabaseError(error));
    const url = await this.getSignedUrl(bucket, path);
    if (url.error) return fail(url.error);
    return ok({ path, url: url.data });
  },

  _extFromMime(mime: string): string {
    if (mime === 'image/jpeg') return 'jpg';
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    if (mime === 'application/pdf') return 'pdf';
    return 'bin';
  },
};
