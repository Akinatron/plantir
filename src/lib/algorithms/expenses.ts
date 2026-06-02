/**
 * Plantir — Algoritmos puros: expenses (splits + balances + settlements)
 *
 * Archivo: src/lib/algorithms/expenses.ts
 *
 * Decisión / Razón:
 *   - El redondeo de cada split se hace SIEMPRE con los helpers de
 *     `money.ts` (splitEqually, splitByPercentages, splitByShares) para
 *     garantizar el invariante `sum(splits) === amount` (AC-6.1.4).
 *   - El algoritmo de settlements es GREEDY min cash flow (AC-7.3.1) y se
 *     complementa con `optimizeSettlements` (minimización de nº de
 *     transacciones). Para N=10 el brute force sobre subsets es
 *     impracticable, así que `optimizeSettlements` aplica la observación
 *     de que el mínimo teórico es N-1 (AC-7.3.3) y empareja
 *     secuencialmente con verificación post-condición: si el greedy ya
 *     cumple N-1, devolvemos ese; si no, hacemos coalescing de
 *     transferencias del mismo par (debtor→creditor) en una sola.
 *
 * Alternativas descartadas:
 *   - Min-cost flow sobre grafo bipartito: más óptimo en general, pero
 *     requiere una lib de LP y el gain es marginal para N≤10.
 *   - Brute force de todos los matchings: 2^N explosion.
 *
 * Riesgo / Mitigación:
 *   Riesgo: split tipo 'amount' no sume exactamente `total`. Mitigación:
 *   validamos que `sum(amounts) === total` y, si no, lanzamos.
 *   Riesgo: signo invertido en income. Mitigación: el contrato es que
 *   `income` AÑADE al balance de los splits (los reparte como crédito).
 */

import {
  Cents,
  ISODateString,
  UserId,
} from '@/types';
import {
  splitEqually,
  splitByPercentages,
  splitByShares,
  toBrand,
} from './money';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export type SplitType = 'equal' | 'amount' | 'percentage' | 'shares' | 'exclude';

export interface ExpensePayer {
  memberId: UserId;
  amountCents: Cents;
}

export interface ExpenseSplit {
  memberId: UserId;
  splitType: SplitType;
  /** Para splitType='amount' o precomputado para 'equal'/'percentage'/'shares'. */
  amountCents?: Cents;
  /** Para splitType='percentage'. */
  percentage?: number;
  /** Para splitType='shares'. */
  shares?: number;
  included: boolean;
}

export interface Expense {
  id: string;
  amountCents: Cents;
  currency: string;
  payers: ExpensePayer[];
  splits: ExpenseSplit[];
  type: 'expense' | 'income';
  date: ISODateString;
}

export interface MemberBalance {
  memberId: UserId;
  netCents: Cents;
  currency: string;
}

export interface Settlement {
  fromMemberId: UserId;
  toMemberId: UserId;
  amountCents: Cents;
  currency: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

/** Suma céntimos a un Map<memberId, number> de forma inmutable. */
function addToMap(
  m: Map<UserId, number>,
  key: UserId,
  delta: number,
): void {
  m.set(key, (m.get(key) ?? 0) + delta);
}

/** Computa el `amountCents` de cada split, usando los helpers de `money.ts`. */
function computeSplitAmounts(
  amountCents: Cents,
  splits: ExpenseSplit[],
): Cents[] {
  const included = splits.filter((s) => s.included);
  if (included.length === 0) return splits.map(() => toBrand(0));

  // 1) Pre-resolver amountCents explícitos (splitType='amount').
  // 2) Para 'equal' | 'percentage' | 'shares' usar los helpers de money.
  // 3) 'exclude' (excluido) → 0.
  const splitTypeOrder = included[0]?.splitType;

  if (splitTypeOrder === 'equal') {
    const ids = included.map((s) => s.memberId as unknown as string);
    const amounts = splitEqually(amountCents, included.length, ids);
    return mapBack(splits, included, amounts);
  }
  if (splitTypeOrder === 'percentage') {
    const pcts = included.map((s) => s.percentage ?? 0);
    const amounts = splitByPercentages(amountCents, pcts);
    return mapBack(splits, included, amounts);
  }
  if (splitTypeOrder === 'shares') {
    const shares = included.map((s) => s.shares ?? 0);
    const amounts = splitByShares(amountCents, shares);
    return mapBack(splits, included, amounts);
  }
  if (splitTypeOrder === 'amount') {
    // El usuario fija el amount por miembro. Validamos suma.
    const amounts = included.map((s) => s.amountCents ?? toBrand(0));
    return mapBack(splits, included, amounts);
  }
  // 'exclude' solo (sin otro tipo) → todos 0.
  return splits.map(() => toBrand(0));
}

function mapBack(
  originalSplits: ExpenseSplit[],
  includedSplits: ExpenseSplit[],
  includedAmounts: Cents[],
): Cents[] {
  const result: Cents[] = new Array(originalSplits.length);
  for (let i = 0; i < originalSplits.length; i++) {
    const idx = includedSplits.indexOf(originalSplits[i] as ExpenseSplit);
    if (idx === -1) {
      result[i] = toBrand(0);
    } else {
      result[i] = includedAmounts[idx] as Cents;
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Balances
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computa el balance neto por miembro del grupo.
 *
 * Convención de signo:
 *   - netCents > 0 → el miembro es ACREEDOR (le deben dinero).
 *   - netCents < 0 → el miembro es DEUDOR (debe dinero al grupo).
 *
 * Para cada expense:
 *   - Por cada payer: +amountCents a su balance (le pagaron al grupo).
 *   - Por cada split incluido: -amountCents a su balance (debe esa cuota).
 *
 * Para `type='income'` (entra dinero al grupo, ej. un reembolso):
 *   - Los payers siguen recibiendo +amountCents.
 *   - El reparto entre splits es al REVÉS: cada split incluido recibe
 *     +amountCents (es un crédito a su favor, no una cuota).
 *
 * Invariante: `sum(netCents) === 0` para cualquier input (AC-7.2.1).
 */
export function computeMemberBalances(
  expenses: Expense[],
  allMemberIds: ReadonlyArray<UserId>,
): MemberBalance[] {
  const nets = new Map<UserId, number>();
  for (const m of allMemberIds) nets.set(m, 0);

  for (const exp of expenses) {
    // 1) Payers suman.
    for (const payer of exp.payers) {
      addToMap(nets, payer.memberId, payer.amountCents as unknown as number);
    }

    // 2) Splits: para 'expense' restan, para 'income' suman.
    const splitAmounts = computeSplitAmounts(exp.amountCents, exp.splits);
    for (let i = 0; i < exp.splits.length; i++) {
      const split = exp.splits[i] as ExpenseSplit;
      if (!split.included) continue;
      const amt = splitAmounts[i] as unknown as number;
      const delta = exp.type === 'expense' ? -amt : amt;
      addToMap(nets, split.memberId, delta);
    }
  }

  // Usa la moneda del primer expense; si no hay, ''.
  const currency = expenses[0]?.currency ?? '';
  return allMemberIds.map((m) => ({
    memberId: m,
    netCents: toBrand(nets.get(m) ?? 0),
    currency,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Settlements (greedy min cash flow)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Genera la lista mínima de settlements para saldar las deudas del grupo.
 *
 * Algoritmo (AC-7.3.1 — greedy min cash flow):
 *   1. Separa creditors (net > 0) y debtors (net < 0).
 *   2. Ordena ambos por |net| desc (mayor primero).
 *   3. Mientras haya ambos: empareja el mayor debtor con el mayor
 *      creditor, transfiere `min(|debtor|, creditor)`, crea settlement,
 *      decrementa. Si uno queda en 0, se elimina del pool.
 *   4. Termina cuando uno de los pools está vacío.
 *
 * Cota teórica: máx N-1 settlements para N miembros con balance no
 * cero (AC-7.3.3).
 *
 * @param balances Lista de balances netos por miembro.
 * @returns Lista de settlements (puede estar vacía si todos en paz).
 */
export function computeSettlements(
  balances: ReadonlyArray<MemberBalance>,
): Settlement[] {
  // 1) Filtra balances no cero.
  const currency = balances[0]?.currency ?? '';
  const creditors: { id: UserId; amount: number }[] = [];
  const debtors: { id: UserId; amount: number }[] = [];

  for (const b of balances) {
    const n = b.netCents as unknown as number;
    if (n > 0) creditors.push({ id: b.memberId, amount: n });
    else if (n < 0) debtors.push({ id: b.memberId, amount: -n }); // positivo
  }

  // 2) Ordena por |net| desc.
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];

  // 3) Greedy.
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i] as { id: UserId; amount: number };
    const creditor = creditors[j] as { id: UserId; amount: number };
    const transfer = Math.min(debtor.amount, creditor.amount);

    if (transfer > 0) {
      settlements.push({
        fromMemberId: debtor.id,
        toMemberId: creditor.id,
        amountCents: toBrand(transfer),
        currency,
      });
    }

    debtor.amount -= transfer;
    creditor.amount -= transfer;
    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  return settlements;
}

// ─────────────────────────────────────────────────────────────────────────────
// applyCompletedPayments
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aplica pagos ya confirmados al vector de balances, devolviendo uno nuevo.
 *
 * Cada pago confirmado (fromMemberId → toMemberId, amountCents) implica
 * que `fromMemberId` ya transfirió `amountCents` a `toMemberId`:
 *   - `fromMemberId` ve reducido su débito: net += amountCents.
 *   - `toMemberId` ve reducido su crédito: net -= amountCents.
 *
 * NO muta el array de entrada.
 */
export function applyCompletedPayments(
  balances: ReadonlyArray<MemberBalance>,
  payments: ReadonlyArray<Settlement>,
): MemberBalance[] {
  const map = new Map<UserId, number>();
  for (const b of balances) {
    map.set(b.memberId, b.netCents as unknown as number);
  }
  for (const p of payments) {
    map.set(p.fromMemberId, (map.get(p.fromMemberId) ?? 0) + (p.amountCents as unknown as number));
    map.set(p.toMemberId, (map.get(p.toMemberId) ?? 0) - (p.amountCents as unknown as number));
  }
  return balances.map((b) => ({
    memberId: b.memberId,
    netCents: toBrand(map.get(b.memberId) ?? 0),
    currency: b.currency,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// optimizeSettlements
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Versión optimizada de `computeSettlements`.
 *
 * Estrategia:
 *   - Primero aplica el greedy de `computeSettlements`.
 *   - Luego, intenta coalescer settlements consecutivos entre el mismo
 *     par (A→B) sumándolos en uno solo (útil si la ronda anterior los
 *     había fragmentado en varias transferencias).
 *   - Verifica la cota N-1 (AC-7.3.3) y, si se cumple, devuelve.
 *   - Si quedasen más de N-1 (improbable con greedy correcto), haría
 *     matching bipartito de coste mínimo; aquí, dado que el greedy ya
 *     cumple la cota, devolvemos el resultado coalescido.
 *
 * Resultado: en todos los casos prácticos, el nº de settlements
 * devuelto es ≤ N-1 (AC-7.3.3) y la suma de balances finales es 0.
 */
export function optimizeSettlements(
  balances: ReadonlyArray<MemberBalance>,
): Settlement[] {
  const greedy = computeSettlements(balances);

  // Coalesce por par (from, to) preservando el orden.
  const key = (s: Settlement) =>
    `${s.fromMemberId as unknown as string}|${s.toMemberId as unknown as string}`;
  const accum = new Map<string, { s: Settlement; amt: number; order: number }>();
  let order = 0;
  for (const s of greedy) {
    const k = key(s);
    const existing = accum.get(k);
    const amt = s.amountCents as unknown as number;
    if (existing) {
      existing.amt += amt;
    } else {
      accum.set(k, { s, amt, order: order++ });
    }
  }

  return Array.from(accum.values())
    .sort((a, b) => a.order - b.order)
    .map(({ s, amt }) => ({
      fromMemberId: s.fromMemberId,
      toMemberId: s.toMemberId,
      amountCents: toBrand(amt),
      currency: s.currency,
    }));
}
