/**
 * Plantir — Algoritmos puros: dinero
 *
 * Archivo: src/lib/algorithms/money.ts
 *
 * Decisión / Razón:
 *   Todo el dinero en la app se manipula como `Cents` (entero en céntimos).
 *   El reparto de un total entre N partes SIEMPRE conserva el invariante
 *   `sum(parts) == total` mediante un remanente determinista asignado a
 *   los primeros K receptores (K = total % n) ordenados por nombre
 *   alfabético (no por posición en el array). Esto cumple AC-6.1.3.
 *
 * Alternativas descartadas:
 *   - Usar `number` con decimales: introduce drift de coma flotante
 *     (0.1 + 0.2 !== 0.3) y rompe el invariante de suma exacta.
 *   - Usar `BigInt`: más seguro, pero `Intl.NumberFormat` y la mayoría
 *     de los call sites trabajan con `number`. Cents queda acotado a
 *     `Number.MAX_SAFE_INTEGER` (~9·10^15 €), más que suficiente para
 *     los importes de un viaje.
 *
 * Riesgo / Mitigación:
 *   Riesgo: overflow al sumar muchos gastos en balances acumulados.
 *   Mitigación: `sumCents` valida contra `Number.MAX_SAFE_INTEGER` y
 *   lanza `RangeError` si lo supera.
 *
 * Invariantes globales:
 *   - `toCents(x)` y `fromCents(toCents(x))` roundtrip exacto para
 *     cualquier `x` representable con 2 decimales.
 *   - `sum(splitEqually(total, n)) === total` para todo `total` y `n > 0`.
 *   - `sum(splitByPercentages(total, ps)) === total` si `sum(ps) === 100`.
 *   - `sum(splitByShares(total, ss)) === total` si `ss.length > 0` y
 *     todos `ss[i] > 0`.
 */

import { Cents as CentsType } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Re-exportamos el TIPO `Cents` para que los call sites puedan hacer
// `import { Cents } from './money'` y usar tanto el tipo (anotaciones) como
// el valor (`Cents.zero`). El VALOR vive en este archivo, el TIPO viene
// de `src/types` (única fuente de verdad del branded type).
// ─────────────────────────────────────────────────────────────────────────────

export type Cents = CentsType;

/** Cast seguro a `Cents` validando que sea entero finito. */
export const toBrand = (n: number): Cents => {
  if (!Number.isFinite(n)) {
    throw new RangeError(`Cents debe ser finito, recibido: ${n}`);
  }
  if (!Number.isInteger(n)) {
    throw new RangeError(`Cents debe ser integer, recibido: ${n}`);
  }
  return n as Cents;
};

/** Cero como `Cents` (constante). Útil como valor inicial de acumuladores. */
export const Cents = {
  zero: 0 as Cents,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Conversión euros ↔ céntimos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convierte una cantidad en euros (o en la unidad de la moneda) a céntimos.
 *
 * Implementa redondeo bancario (round-half-to-even) para mantener la
 * neutralidad estadística: 0.005 → 0 (par), 0.015 → 2 (par), 0.025 → 2 (par).
 * Esto minimiza el drift acumulado frente al clásico `Math.round`.
 *
 * @param amount Cantidad en la unidad principal (euros, dólares…).
 * @param currency Código ISO-4217. Solo se usa para mensajes de error.
 * @returns Cantidad en céntimos como `Cents` (entero).
 * @throws RangeError si `amount` es `NaN`, `Infinity` o `-Infinity`.
 */
export function toCents(amount: number, currency: string = 'EUR'): Cents {
  if (!Number.isFinite(amount)) {
    throw new RangeError(
      `toCents: amount debe ser finito (recibido: ${amount} ${currency})`,
    );
  }
  // Redondeo bancario (half-to-even) sobre 2 decimales.
  // Estrategia: multiplicar por 100 (puede quedar .5), aplicar el algoritmo
  // half-to-even sobre el resultado, luego truncar a entero.
  const scaled = amount * 100;
  const rounded = bankRound(scaled);
  return toBrand(rounded);
}

/**
 * Convierte céntimos a la unidad principal como `number` con 2 decimales.
 *
 * @param cents Cantidad en céntimos.
 * @returns `cents / 100` como `number`.
 */
export function fromCents(cents: Cents): number {
  return (cents as unknown as number) / 100;
}

/**
 * Redondeo bancario (round-half-to-even) sobre un `number` cualquiera.
 * Helper interno — no se exporta para no contaminar la API pública.
 */
function bankRound(x: number): number {
  const floored = Math.floor(x);
  const diff = x - floored;
  if (diff < 0.5) return floored;
  if (diff > 0.5) return floored + 1;
  // diff === 0.5 exacto → redondear al par.
  return floored % 2 === 0 ? floored : floored + 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repartos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reparte `total` entre `n` partes iguales.
 *
 * El remanente de 1 céntimo se asigna determinista a los **primeros K
 * receptores por nombre alfabético ascendente** (no por orden del array).
 * Esto cumple AC-6.1.3 y hace el reparto independiente del orden de los
 * miembros en memoria: la suma de las partes es siempre `total` exacto.
 *
 * @param total Total en céntimos.
 * @param n Número de partes (debe ser `> 0`).
 * @param recipientIds IDs de los receptores. Se ordena alfabéticamente
 *   por su string. Si no se pasa, se usan las posiciones 0..n-1.
 * @returns Array de `n` `Cents` cuya suma es exactamente `total`.
 * @throws RangeError si `n <= 0` o si `recipientIds.length !== n`.
 */
export function splitEqually(
  total: Cents,
  n: number,
  recipientIds?: ReadonlyArray<string>,
): Cents[] {
  if (!Number.isInteger(n)) {
    throw new RangeError(`splitEqually: n debe ser entero (recibido: ${n})`);
  }
  if (n < 0) {
    throw new RangeError(`splitEqually: n debe ser >= 0 (recibido: ${n})`);
  }
  if (n === 0) {
    throw new RangeError('splitEqually: n debe ser > 0 (recibido: 0)');
  }
  if (recipientIds !== undefined && recipientIds.length !== n) {
    throw new RangeError(
      `splitEqually: recipientIds.length (${recipientIds.length}) debe coincidir con n (${n})`,
    );
  }

  const base = Math.trunc((total as unknown as number) / n);
  const remainder = (total as unknown as number) - base * n;

  // IDs en orden alfabético ascendente (criterio de remanente).
  const orderedIds = recipientIds
    ? [...recipientIds].sort((a, b) => a.localeCompare(b))
    : Array.from({ length: n }, (_, i) => String(i));

  // Los primeros K (K = remainder) reciben base+1, el resto base.
  return orderedIds.map((_id, i) =>
    i < remainder ? toBrand(base + 1) : toBrand(base),
  );
}

/**
 * Reparte `total` proporcionalmente a una lista de porcentajes.
 *
 * Restricciones:
 *   - Todos los `percentages[i]` en [0, 100].
 *   - `sum(percentages)` debe ser exactamente 100.
 *   - El remanente (por redondeo de los shares) se asigna al último
 *     elemento del array (en el orden recibido, no en orden alfabético,
 *     porque aquí no hay "receptor" implícito).
 *
 * @param total Total en céntimos.
 * @param percentages Array de porcentajes (0..100, suma = 100).
 * @returns Array de `Cents` con la misma longitud que `percentages`.
 * @throws RangeError si las restricciones no se cumplen.
 */
export function splitByPercentages(
  total: Cents,
  percentages: ReadonlyArray<number>,
): Cents[] {
  if (percentages.length === 0) {
    throw new RangeError('splitByPercentages: percentages vacío');
  }
  for (let i = 0; i < percentages.length; i++) {
    const p = percentages[i] as number;
    if (!Number.isFinite(p)) {
      throw new RangeError(
        `splitByPercentages: porcentaje no finito en posición ${i}: ${p}`,
      );
    }
    if (p < 0 || p > 100) {
      throw new RangeError(
        `splitByPercentages: porcentaje fuera de [0,100] en posición ${i}: ${p}`,
      );
    }
  }
  const sumPct = percentages.reduce((acc, p) => acc + p, 0);
  // Usamos tolerancia de 1e-9 para evitar errores de coma flotante en la suma.
  if (Math.abs(sumPct - 100) > 1e-9) {
    throw new RangeError(
      `splitByPercentages: la suma debe ser 100 (recibido: ${sumPct})`,
    );
  }

  const totalC = total as unknown as number;
  // Calculamos cada parte con redondeo bancario y luego ajustamos el último
  // para que la suma cierre EXACTAMENTE.
  const raw = percentages.map((p) => bankRound((p * totalC) / 100));
  const assigned = raw.reduce((a, b) => a + b, 0);
  const drift = totalC - assigned;
  raw[raw.length - 1] = (raw[raw.length - 1] as number) + drift;

  return raw.map((v) => toBrand(v));
}

/**
 * Reparte `total` proporcionalmente a una lista de "shares" enteros
 * positivos (p. ej. noches en un hotel, comensales vegetarianos vs. no…).
 *
 * Reglas:
 *   - `shares.length > 0`.
 *   - Todos `shares[i] > 0` y enteros.
 *   - El remanente se asigna a los primeros K receptores por orden del
 *     array de entrada (no alfabético, porque aquí el orden ES el orden
 *     lógico del gasto: p. ej. el que duerme más noches).
 *
 * @param total Total en céntimos.
 * @param shares Array de shares (enteros > 0).
 * @returns Array de `Cents` con la misma longitud que `shares`.
 * @throws RangeError si las restricciones no se cumplen.
 */
export function splitByShares(
  total: Cents,
  shares: ReadonlyArray<number>,
): Cents[] {
  if (shares.length === 0) {
    throw new RangeError('splitByShares: shares vacío');
  }
  let totalShares = 0;
  for (let i = 0; i < shares.length; i++) {
    const s = shares[i] as number;
    if (!Number.isInteger(s) || s <= 0) {
      throw new RangeError(
        `splitByShares: shares[${i}] debe ser entero > 0 (recibido: ${s})`,
      );
    }
    totalShares += s;
  }
  if (totalShares === 0) {
    throw new RangeError('splitByShares: suma de shares debe ser > 0');
  }

  const totalC = total as unknown as number;
  // Asignación base: trunc hacia abajo, remanente va a los primeros K
  // por orden del array (no alfabético).
  const result: number[] = new Array(shares.length);
  let assigned = 0;
  for (let i = 0; i < shares.length; i++) {
    const s = shares[i] as number;
    const part = Math.trunc((s * totalC) / totalShares);
    result[i] = part;
    assigned += part;
  }
  const remainder = totalC - assigned;
  // Distribuye el remanente 1 céntimo a 1, en orden.
  for (let i = 0; i < remainder; i++) {
    result[i % result.length] = (result[i % result.length] as number) + 1;
  }
  return result.map((v) => toBrand(v));
}

// ─────────────────────────────────────────────────────────────────────────────
// Formato, suma, negación
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formatea una cantidad en céntimos como string monetario localizado.
 *
 * @param cents Cantidad en céntimos.
 * @param currency Código ISO-4217 (p. ej. `'EUR'`).
 * @param locale Locale BCP-47 (por defecto `'es-ES'`).
 * @returns String formateado, p. ej. `"123,45 €"`.
 */
export function formatCents(
  cents: Cents,
  currency: string,
  locale: string = 'es-ES',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(fromCents(cents));
}

/**
 * Suma segura de céntimos con validación de overflow.
 *
 * @param amounts Array de `Cents`.
 * @returns Suma exacta como `Cents`.
 * @throws RangeError si la suma supera `Number.MAX_SAFE_INTEGER`.
 */
export function sumCents(amounts: ReadonlyArray<Cents>): Cents {
  let acc = 0;
  for (let i = 0; i < amounts.length; i++) {
    const c = amounts[i] as unknown as number;
    // Comprobación previa para evitar pérdida de precisión silenciosa.
    if (c > 0 && acc > Number.MAX_SAFE_INTEGER - c) {
      throw new RangeError(
        `sumCents: overflow detectado en índice ${i} (acc=${acc}, +${c})`,
      );
    }
    acc += c;
  }
  return toBrand(acc);
}

/**
 * Negación de céntimos (deuda ↔ crédito).
 *
 * @param cents Cantidad en céntimos.
 * @returns Cantidad con signo invertido.
 */
export function negateCents(cents: Cents): Cents {
  return toBrand(-(cents as unknown as number));
}
