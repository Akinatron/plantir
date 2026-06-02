/**
 * Algoritmos puros para Edge Functions (Deno).
 *
 * Re-implementación en JS plano de los algoritmos de Fase 2, sin
 * dependencias de TS. El cliente `Supabase Client` y la Edge Function
 * Deno NO pueden compartir los .ts del cliente directamente porque
 * usan módulos de npm distintos. Mantenerlos sincronizados manualmente
 * (mismos tests conceptuales, mismas fórmulas).
 *
 * Si en el futuro se quiere una única implementación, se puede
 * compilar el .ts del cliente a JS con esbuild o tsc y consumirlo
 * desde la Edge Function.
 */

export type Availability = 'available' | 'prefer' | 'maybe' | 'unavailable';

export interface DateRange {
  start: string;
  end: string;
}

export interface AvailabilityRange extends DateRange {
  availability: Availability;
}

export interface PollConfig {
  allowedRanges: DateRange[];
  minTripDays: number;
  maxTripDays: number;
  maybeWeight: number;
  preferWeight: number;
  canWeight: number;
  cannotWeight: number;
  requiredMemberIds: string[];
  pendingPolicy: 'include' | 'exclude' | 'penalize';
}

export interface UserAvailability {
  userId: string;
  ranges: AvailabilityRange[];
}

export interface CandidateDate {
  start: string;
  end: string;
  durationDays: number;
  availableMembers: string[];
  preferredMembers: string[];
  maybeMembers: string[];
  unavailableMembers: string[];
  pendingMembers: string[];
  requiredMembersMissing: string[];
  score: number;
  rank: number;
  rankReason: string;
}

function dayNumber(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new RangeError(`ISO inválido: ${iso}`);
  return Math.floor(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!) / 86_400_000);
}

function dayToISO(n: number): string {
  const d = new Date(n * 86_400_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function rangesOverlap(a: DateRange, b: DateRange): boolean {
  return dayNumber(a.start) <= dayNumber(b.end) && dayNumber(b.start) <= dayNumber(a.end);
}

function classifyAvailability(candidate: DateRange, userRanges: AvailabilityRange[]): Availability {
  const candStart = dayNumber(candidate.start);
  const candEnd = dayNumber(candidate.end);
  for (const r of userRanges) {
    if (r.availability === 'unavailable' && rangesOverlap(r, candidate)) {
      return 'unavailable';
    }
  }
  const coverages: Availability[] = [];
  for (let day = candStart; day <= candEnd; day++) {
    let best: Availability = 'unavailable';
    for (const r of userRanges) {
      if (r.availability === 'unavailable') continue;
      const rStart = dayNumber(r.start);
      const rEnd = dayNumber(r.end);
      if (rStart <= day && day <= rEnd) {
        if (r.availability === 'prefer') best = 'prefer';
        else if (r.availability === 'available' && best !== 'prefer') best = 'available';
        else if (r.availability === 'maybe' && best === 'unavailable') best = 'maybe';
      }
    }
    coverages.push(best);
  }
  if (coverages.includes('unavailable')) return 'unavailable';
  if (coverages.every((c) => c === 'prefer')) return 'prefer';
  if (coverages.includes('prefer')) return 'prefer';
  if (coverages.includes('available')) return 'available';
  return 'maybe';
}

function generateCandidates(allowedRanges: DateRange[], d: number): DateRange[] {
  const out: DateRange[] = [];
  for (const range of allowedRanges) {
    const startN = dayNumber(range.start);
    const endN = dayNumber(range.end);
    for (let s = startN; s + d - 1 <= endN; s++) {
      out.push({ start: dayToISO(s), end: dayToISO(s + d - 1) });
    }
  }
  return out;
}

export function computeDatePollCandidates(
  config: PollConfig,
  availabilities: UserAvailability[],
  allMemberIds: string[],
): CandidateDate[] {
  if (config.minTripDays < 1) throw new RangeError('minTripDays debe ser >= 1');
  if (config.maxTripDays < config.minTripDays) {
    throw new RangeError('maxTripDays debe ser >= minTripDays');
  }
  if (config.allowedRanges.length === 0) {
    throw new RangeError('allowedRanges vacío');
  }
  const candidates: DateRange[] = [];
  for (let d = config.minTripDays; d <= config.maxTripDays; d++) {
    candidates.push(...generateCandidates(config.allowedRanges, d));
  }
  if (candidates.length === 0) return [];

  const avByUser = new Map(availabilities.map((av) => [av.userId, av]));
  const requiredSet = new Set(config.requiredMemberIds);
  const allMembersSet = new Set(allMemberIds);
  const votersSet = new Set(avByUser.keys());
  const pendingSet = new Set<string>();
  for (const m of allMembersSet) {
    if (!votersSet.has(m)) pendingSet.add(m);
  }

  const enriched: CandidateDate[] = [];
  for (const cand of candidates) {
    const preferredMembers: string[] = [];
    const availableMembers: string[] = [];
    const maybeMembers: string[] = [];
    const unavailableMembers: string[] = [];
    const pendingMembers: string[] = [];
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
    let score =
      preferredMembers.length * config.preferWeight +
      availableMembers.length * config.canWeight +
      maybeMembers.length * config.maybeWeight +
      unavailableMembers.length * config.cannotWeight;
    const requiredMissing = requiredSet.size === 0
      ? []
      : Array.from(requiredSet).filter(
          (rid) => !preferredMembers.includes(rid) && !availableMembers.includes(rid),
        );
    score -= requiredMissing.length * 100;
    if (config.pendingPolicy === 'exclude') score -= pendingMembers.length * 50;
    else if (config.pendingPolicy === 'penalize') score -= pendingMembers.length * 25;
    const durationDays = dayNumber(cand.end) - dayNumber(cand.start) + 1;
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
      rank: 0,
      rankReason: '',
    });
  }
  const midpoint = Math.floor((config.minTripDays + config.maxTripDays) / 2);
  enriched.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.requiredMembersMissing.length !== b.requiredMembersMissing.length) {
      return a.requiredMembersMissing.length - b.requiredMembersMissing.length;
    }
    const da = Math.abs(a.durationDays - midpoint);
    const db = Math.abs(b.durationDays - midpoint);
    if (da !== db) return da - db;
    if (a.start !== b.start) return a.start.localeCompare(b.start);
    return 0;
  });
  enriched.forEach((c, i) => {
    c.rank = i + 1;
    c.rankReason = `#${i + 1} de ${enriched.length} · score=${c.score}`;
  });
  return enriched;
}
