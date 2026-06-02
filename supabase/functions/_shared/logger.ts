/**
 * Logger estructurado para Edge Functions.
 *
 * En producción, envía a un servicio de logging (Datadog, Sentry, etc).
 * Aquí solo escribe a stdout con JSON estructurado.
 */

export function log(
  level: 'debug' | 'info' | 'warn' | 'error',
  event: string,
  data: Record<string, unknown> = {},
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...data,
  };
  console.log(JSON.stringify(entry));
}
