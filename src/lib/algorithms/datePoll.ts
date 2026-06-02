/**
 * Plantir — Algoritmos puros: date poll
 *
 * Archivo: src/lib/algorithms/datePoll.ts
 *
 * Propósito: dado un conjunto de rangos permitidos (p. ej. "del 1 al 31 de
 * julio") y la disponibilidad declarada por cada miembro, generar y rankear
 * todos los sub-rangos de duración [minTripDays, maxTripDays] candidatos a
 * ser las fechas del viaje.
 *
 * Decisión / Razón:
 *   El score combina los pesos configurables (prefer / can / maybe / cannot)
 *   y PENALIZA muy fuerte a los candidatos que excluyen a algún miembro
 *   marcado como `required`. Esto prioriza la inclusividad sobre la mera
 *   maximización del confort.
 *
 *   El desempate es:
 *     1) score desc
 *     2) requiredMembersMissing asc
 *     3) duration asc hacia `midpoint = floor((min+max)/2)` (más cercano al centro)
 *     4) start asc
 *   De este modo gana el más popular; en empate, el que excluye menos
 *   required; luego el más neutro en duración; luego el más temprano.
 *
 * Alternativas descartadas:
 *   - Fuerza bruta con `score = sum_yes`: ignora required y maybe.
 *   - Multi-armed bandit: overkill para MVP.
 *
 * Riesgo / Mitigación:
 *   Explosión combinatoria: con 30 opciones de fecha × 2 semanas cada
 *   una × 7 días de duración, el nº de candidatos es ~cientos. Mitigación:
 *   los rangos vienen de una UI y `maxTripDays - minTripDays` se espera
 *   pequeño (3..14). Si en el futuro se vuelve lento, cachear por hash
 *   de `(allowedRanges, members)`.
 */

import {
  ISODateString as ISODateStringType,
  UserId as UserIdType,
} from '@/types';

// Re-exportar los tipos para que los tests puedan importarlos desde
// `datePoll` y tener un único punto de entrada.
export type ISODateString = ISODateStringType;
export type UserId = UserIdType;

// ─────────────────────────────────────────────────────────────────────────────
// Tipos del dominio
// ─────────────────────────────────────────────────────────────────────────────

/** Rango de fechas en formato ISO-8601 (date-only, `YYYY-MM-DD`). */
export interface DateRange {
  start: ISODateString;
  end: ISODateString;
}

/** Nivel de disponibilidad declarado por un usuario. */
export type Availability = 'available' | 'prefer' | 'maybe' | 'unavailable';

/** Sub-rango votado por un usuario. */
export interface AvailabilityRange {
  start: ISODateString;
  end: ISODateString;
  availability: Availability;
}

/** Disponibilidad agregada de un usuario en este poll. */
export interface UserAvailability {
  userId: UserId;
  ranges: AvailabilityRange[];
}

/** Política aplicada a usuarios en estado `pending`. */
export type PendingPolicy = 'include' | 'exclude' | 'penalize';

/** Configuración del poll. */
export interface PollConfig {
  allowedRanges: DateRange[];
  minTripDays: number;
  maxTripDays: number;
  maybeWeight: number;
  preferWeight: number;
  canWeight: number;
  cannotWeight: number;
  requiredMemberIds: UserId[];
  pendingPolicy: PendingPolicy;
}

/** Candidato rankeado devuelto por la función. */
export interface CandidateDate {
  start: ISODateString;
  end: ISODateString;
  durationDays: number;
  availableMembers: UserId[];
  preferredMembers: UserId[];
  maybeMembers: UserId[];
  unavailableMembers: UserId[];
  pendingMembers: UserId[];
  requiredMembersMissing: UserId[];
  score: number;
  rank: number;
  rankReason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de fecha (puros, sin Date con efectos de timezone)
// ─────────────────────────────────────────────────────────────────────────────

/** Convierte un `ISODateString` (date-only) a número de días desde epoch UTC. */
function dayNumber(iso: ISODateString): number {
  // El formato esperado es 'YYYY-MM-DD'. Validamos para fallar pronto.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso as unknown as string);
  if (!m) {
    throw new RangeError(`dayNumber: ISO date inválido: ${String(iso)}`);
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  // Date.UTC(y, mo-1, d) nos da los milisegundos exactos del día.
  return Math.floor(Date.UTC(y, mo - 1, d) / 86_400_000);
}

/** Inverso de `dayNumber`. */
function dayToISO(n: number): ISODateString {
  const d = new Date(n * 86_400_000);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${da}` as ISODateString;
}

/** Diferencia en días entre dos ISO dates (`b - a`, entero). */
function diffDays(a: ISODateString, b: ISODateString): number {
  return dayNumber(b) - dayNumber(a);
}

/** `true` si dos rangos se solapan en al menos un día. */
function rangesOverlap(
  a: DateRange | AvailabilityRange,
  b: DateRange | AvailabilityRange,
): boolean {
  const aStart = dayNumber(a.start);
  const aEnd = dayNumber(a.end);
  const bStart = dayNumber(b.start);
  const bEnd = dayNumber(b.end);
  return aStart <= bEnd && bStart <= aEnd;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generación de candidatos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Genera todos los sub-rangos de duración `d` (en días) contenidos en
 * algún `allowedRange` y que tengan exactamente `d` días de duración
 * (inclusive en ambos extremos → `d = diffDays(start, end) + 1`).
 */
function generateCandidates(
  allowedRanges: DateRange[],
  d: number,
): DateRange[] {
  const out: DateRange[] = [];
  for (const range of allowedRanges) {
    const startN = dayNumber(range.start);
    const endN = dayNumber(range.end);
    // Empezamos en cada día posible y avanzamos `d-1`.
    for (let s = startN; s + d - 1 <= endN; s++) {
      out.push({
        start: dayToISO(s),
        end: dayToISO(s + d - 1),
      });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Intersección con disponibilidades
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve la categoría de disponibilidad que el usuario `user` tiene
 * sobre el rango `candidate`. Reglas:
 *   - Si ALGÚN sub-rango del usuario marcado como 'unavailable' se solapa
 *     con el candidato, el resultado es 'unavailable'.
 *   - Si TODOS los días del candidato están cubiertos por un rango 'prefer',
 *     el resultado es 'prefer'.
 *   - Si TODOS los días están cubiertos por al menos un rango
 *     ('available' | 'prefer' | 'maybe'), el resultado es el MEJOR de
 *     esos: prefer > available > maybe.
 *   - En cualquier otro caso (días sin cobertura) → 'unavailable'.
 *
 * Esto modela "el usuario declara huecos en su calendario; si un día
 * cae fuera, no puede".
 */
function classifyAvailability(
  candidate: DateRange,
  userRanges: AvailabilityRange[],
): Availability {
  const candStart = dayNumber(candidate.start);
  const candEnd = dayNumber(candidate.end);
  const totalDays = candEnd - candStart + 1;

  // Paso 1: si algún 'unavailable' del usuario toca el candidato, fin.
  for (const r of userRanges) {
    if (r.availability === 'unavailable' && rangesOverlap(r, candidate)) {
      return 'unavailable';
    }
  }

  // Paso 2: necesitamos cubrir todos los días con 'available' | 'prefer' | 'maybe'.
  // Para cada día del candidato, hallamos la mejor cobertura del usuario.
  const coverages: Availability[] = [];
  for (let day = candStart; day <= candEnd; day++) {
    let best: Availability = 'unavailable';
    for (const r of userRanges) {
      if (r.availability === 'unavailable') continue; // ya filtrado arriba
      const rStart = dayNumber(r.start);
      const rEnd = dayNumber(r.end);
      if (rStart <= day && day <= rEnd) {
        if (r.availability === 'prefer') {
          best = 'prefer';
        } else if (r.availability === 'available' && best !== 'prefer') {
          best = 'available';
        } else if (r.availability === 'maybe' && best === 'unavailable') {
          best = 'maybe';
        }
      }
    }
    coverages.push(best);
  }

  if (coverages.length !== totalDays) {
    // No debería pasar porque iteramos día a día, pero por seguridad.
    return 'unavailable';
  }
  // Si algún día quedó 'unavailable' → el usuario no puede.
  if (coverages.includes('unavailable')) return 'unavailable';
  // Si todos son 'prefer' → prefer.
  if (coverages.every((c) => c === 'prefer')) return 'prefer';
  // Si hay mezcla y al menos un prefer → prefer gana como "mejor disponible".
  if (coverages.includes('prefer')) return 'prefer';
  // Si hay al menos un 'available' y el resto son 'available'/'maybe' → available.
  if (coverages.includes('available')) return 'available';
  // Solo maybe.
  return 'maybe';
}

// ─────────────────────────────────────────────────────────────────────────────
// API principal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computa los candidatos a fecha del viaje rankeados.
 *
 * @param config Configuración del poll (rangos, pesos, required, etc.).
 * @param availabilities Lista de disponibilidades por usuario.
 * @param allMemberIds IDs de todos los miembros del viaje (incluye
 *   los que NO han votado todavía → caen en `pendingMembers`).
 * @returns Lista de candidatos ordenados (rank 1 = el ganador).
 */
export function computeDatePollCandidates(
  config: PollConfig,
  availabilities: UserAvailability[],
  allMemberIds: ReadonlyArray<UserId>,
): CandidateDate[] {
  // 1) Validación básica de config.
  if (config.minTripDays < 1) {
    throw new RangeError('computeDatePollCandidates: minTripDays debe ser >= 1');
  }
  if (config.maxTripDays < config.minTripDays) {
    throw new RangeError(
      'computeDatePollCandidates: maxTripDays debe ser >= minTripDays',
    );
  }
  if (config.allowedRanges.length === 0) {
    throw new RangeError('computeDatePollCandidates: allowedRanges vacío');
  }

  // 2) Genera todos los candidatos (suma de allowedRanges × cada duración).
  const candidates: DateRange[] = [];
  for (let d = config.minTripDays; d <= config.maxTripDays; d++) {
    candidates.push(...generateCandidates(config.allowedRanges, d));
  }
  if (candidates.length === 0) return [];

  // 3) Indexa las disponibilidades por userId.
  const avByUser = new Map<UserId, UserAvailability>();
  for (const av of availabilities) {
    avByUser.set(av.userId, av);
  }

  // 4) Para cada candidato, computa intersección.
  const requiredSet = new Set<UserId>(config.requiredMemberIds);
  const allMembersSet = new Set<UserId>(allMemberIds);
  const votersSet = new Set<UserId>(avByUser.keys());
  const pendingSet = new Set<UserId>();
  for (const m of allMembersSet) {
    if (!votersSet.has(m)) pendingSet.add(m);
  }

  const enriched: CandidateDate[] = [];
  for (const cand of candidates) {
    const preferredMembers: UserId[] = [];
    const availableMembers: UserId[] = [];
    const maybeMembers: UserId[] = [];
    const unavailableMembers: UserId[] = [];
    const pendingMembers: UserId[] = [];

    for (const memberId of allMembersSet) {
      const av = avByUser.get(memberId);
      if (!av) {
        pendingMembers.push(memberId);
        continue;
      }
      const cls = classifyAvailability(cand, av.ranges);
      if (cls === 'prefer') preferredMembers.push(memberId);
      else if (cls === 'available') availableMembers.push(memberId);
      else if (cls === 'maybe') maybeMembers.push(memberId);
      else unavailableMembers.push(memberId);
    }

    // Score.
    let score =
      preferredMembers.length * config.preferWeight +
      availableMembers.length * config.canWeight +
      maybeMembers.length * config.maybeWeight +
      unavailableMembers.length * config.cannotWeight;

    // Penalización por required ausentes.
    const requiredMissing = requiredSet.size === 0
      ? []
      : Array.from(requiredSet).filter(
          (rid) =>
            !preferredMembers.includes(rid) &&
            !availableMembers.includes(rid),
        );
    score -= requiredMissing.length * 100;

    // Política de pending.
    if (config.pendingPolicy === 'exclude') {
      score -= pendingMembers.length * 50;
    } else if (config.pendingPolicy === 'penalize') {
      score -= pendingMembers.length * 25;
    }
    // 'include' → no penaliza (los tratamos como disponibles a confirmar).

    const durationDays = diffDays(cand.start, cand.end) + 1;
    enriched.push({
      start: cand.start,
      end: cand.end,
      durationDays,
      availableMembers,
      preferredMembers,
      maybeMembers,
      unavailableMembers,
      pendingMembers,
      requiredMembersMissing: requiredMissing,
      score,
      rank: 0, // se asigna tras ordenar
      rankReason: '', // se asigna tras ordenar
    });
  }

  // 5) Ordena.
  const midpoint = Math.floor((config.minTripDays + config.maxTripDays) / 2);
  enriched.sort((a, b) => {
    // 1) score desc.
    if (a.score !== b.score) return b.score - a.score;
    // 2) requiredMissing asc.
    if (a.requiredMembersMissing.length !== b.requiredMembersMissing.length) {
      return a.requiredMembersMissing.length - b.requiredMembersMissing.length;
    }
    // 3) duración más cercana al midpoint primero.
    const da = Math.abs(a.durationDays - midpoint);
    const db = Math.abs(b.durationDays - midpoint);
    if (da !== db) return da - db;
    // 4) start asc.
    if (a.start !== b.start) {
      return (a.start as unknown as string).localeCompare(
        b.start as unknown as string,
      );
    }
    return 0;
  });

  // 6) Asigna rank + rankReason.
  enriched.forEach((c, i) => {
    c.rank = i + 1;
    c.rankReason = buildRankReason(c, i + 1, enriched.length, midpoint);
  });

  return enriched;
}

function buildRankReason(
  c: CandidateDate,
  rank: number,
  total: number,
  midpoint: number,
): string {
  const parts: string[] = [];
  parts.push(`#${rank} de ${total} candidatos`);
  parts.push(
    `score=${c.score} (prefer=${c.preferredMembers.length}, avail=${c.availableMembers.length}, maybe=${c.maybeMembers.length}, unavail=${c.unavailableMembers.length})`,
  );
  if (c.requiredMembersMissing.length > 0) {
    parts.push(
      `excluye a ${c.requiredMembersMissing.length} miembro(s) requerido(s)`,
    );
  }
  if (c.pendingMembers.length > 0) {
    parts.push(`${c.pendingMembers.length} miembro(s) pendiente(s) de votar`);
  }
  parts.push(`duración=${c.durationDays} días (objetivo ${midpoint})`);
  return parts.join(' · ');
}
