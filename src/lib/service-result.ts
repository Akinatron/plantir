/**
 * Tipo de retorno estándar de los servicios.
 *
 * Patrón funcional: nunca `throw` en la capa de servicios, siempre
 * devolver `ServiceResult<T>` con `{ data, error }` discriminado. La UI
 * lo maneja con TanStack Query (retry, error UI, etc.).
 */

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: ServiceError };

export interface ServiceError {
  /** Categoría de error. La UI la usa para decidir UX (toast vs modal). */
  code:
    | 'unauthorized' // 401 — sesión expirada
    | 'forbidden' // 403 — RLS o policy
    | 'not_found' // 404
    | 'validation' // 422 / 400 — Zod falló
    | 'conflict' // 409 — duplicado, ej. invite used_count > max_uses
    | 'rate_limited' // 429
    | 'network' // sin conexión, timeout
    | 'server' // 5xx
    | 'unknown';
  message: string;
  /** Detalles del backend (sin filtrar al usuario final). */
  details?: unknown;
}

export function ok<T>(data: T): ServiceResult<T> {
  return { data, error: null };
}

export function fail<T = never>(error: ServiceError): ServiceResult<T> {
  return { data: null, error };
}

/**
 * Convierte un error de Supabase en `ServiceError`.
 */
export function fromSupabaseError(err: { code?: string; message?: string } | null): ServiceError {
  if (!err) {
    return { code: 'unknown', message: 'Error desconocido' };
  }
  const code = err.code ?? '';
  // PostgREST error codes: PGRST116 (no rows), 23505 (unique violation), etc.
  // Supabase Auth codes: invalid_credentials, email_not_confirmed, etc.
  if (code === 'PGRST116') return { code: 'not_found', message: 'No encontrado' };
  if (code === '23505') return { code: 'conflict', message: 'Conflicto: ya existe' };
  if (code === '401' || code === 'invalid_credentials') {
    return { code: 'unauthorized', message: 'No autorizado' };
  }
  if (code === '403' || code === '42501') {
    return { code: 'forbidden', message: 'Sin permisos' };
  }
  if (code === '404') return { code: 'not_found', message: 'No encontrado' };
  if (code === '409') return { code: 'conflict', message: 'Conflicto' };
  if (code === '422' || code === '400') {
    return { code: 'validation', message: 'Datos inválidos' };
  }
  if (code === '429') return { code: 'rate_limited', message: 'Demasiadas peticiones' };
  return { code: 'unknown', message: err.message ?? 'Error desconocido' };
}
