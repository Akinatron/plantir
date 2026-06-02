/**
 * Helper para respuestas de error tipadas en Edge Functions.
 *
 * Estructura consistente que el cliente puede parsear y traducir.
 */

import { corsHeaders } from './cors.ts';
import { ZodError } from 'npm:zod@3';

export type FunctionErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'rate_limited'
  | 'server';

export interface FunctionErrorBody {
  code: FunctionErrorCode;
  message: string;
  details?: unknown;
}

export function errorResponse(
  code: FunctionErrorCode,
  message: string,
  status: number,
  details?: unknown,
): Response {
  const body: FunctionErrorBody = { code, message, details };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function handleError(err: unknown): Response {
  if (err instanceof ZodError) {
    return errorResponse('validation', 'Datos inválidos', 422, err.flatten());
  }
  if (err instanceof Error) {
    // Detección básica por mensaje.
    if (err.message.includes('not found')) {
      return errorResponse('not_found', err.message, 404);
    }
    if (err.message.includes('forbidden') || err.message.includes('not allowed')) {
      return errorResponse('forbidden', err.message, 403);
    }
    return errorResponse('server', err.message, 500);
  }
  return errorResponse('server', 'Error interno', 500);
}

export function jsonResponse<T>(data: T, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
