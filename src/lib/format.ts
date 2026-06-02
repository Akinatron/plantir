/**
 * Helpers de formateo: dinero, fechas, porcentajes.
 *
 * Capa delgada sobre `Intl.NumberFormat` y `date-fns` para tener una API
 * consistente y centralizar el locale (es-ES) y la moneda por defecto.
 */

import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Cents, ISODateString } from '@/types';

/**
 * Formatea una cantidad en céntimos como string monetario localizado.
 * Default locale es-ES y default currency EUR.
 */
export function formatCents(
  cents: Cents,
  currency: string = 'EUR',
  locale: string = 'es-ES',
): string {
  const amount = (cents as unknown as number) / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Formatea un ISODateString como fecha corta (ej. "12 jun 2026").
 */
export function formatDate(date: ISODateString, pattern: string = "d MMM yyyy"): string {
  return format(parseISO(date as unknown as string), pattern, { locale: es });
}

/**
 * Formatea un rango de fechas (ej. "12-15 jun 2026" o "12 jun - 15 jun 2026"
 * si跨越 meses/años).
 */
export function formatDateRange(start: ISODateString, end: ISODateString): string {
  const s = parseISO(start as unknown as string);
  const e = parseISO(end as unknown as string);
  const sameYear = s.getUTCFullYear() === e.getUTCFullYear();
  const sameMonth = sameYear && s.getUTCMonth() === e.getUTCMonth();

  if (sameMonth) {
    // ej. "12-15 jun 2026"
    return `${s.getUTCDate()}-${e.getUTCDate()} ${format(s, 'MMM yyyy', { locale: es })}`;
  }
  if (sameYear) {
    // ej. "28 jun - 5 jul 2026"
    return `${format(s, "d MMM", { locale: es })} - ${format(e, "d MMM yyyy", { locale: es })}`;
  }
  // ej. "28 dic 2025 - 5 ene 2026"
  return `${format(s, "d MMM yyyy", { locale: es })} - ${format(e, "d MMM yyyy", { locale: es })}`;
}

/**
 * Formatea un porcentaje (0..100) con 0-2 decimales.
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}
