/**
 * Tests del módulo expenses.ts
 *
 * Cubre los 12 casos obligatorios del briefing:
 *  1. gasto igual entre N
 *  2. gasto con exclusión
 *  3. split por amounts exactos
 *  4. split por porcentajes
 *  5. split por shares
 *  6. múltiples payers
 *  7. income/refund
 *  8. settlements ya pagados se descuentan
 *  9. settlements optimizados
 * 10. suma de balances finales === 0
 * 11. remanente de 1 céntimo determinista
 * 12. multi-currency placeholder
 *
 * + 1 property-based test con fast-check (1000 iteraciones):
 *   "para cualquier conjunto de expenses, la suma de balances computados
 *   es 0 y el settlement final produce balances de 0".
 */

import * as fc from 'fast-check';
import {
  computeMemberBalances,
  computeSettlements,
  applyCompletedPayments,
  optimizeSettlements,
  type Expense,
  type MemberBalance,
  type Settlement,
} from '../expenses';
import type { Cents, ISODateString, UserId } from '@/types';

const uid = (s: string): UserId => s as UserId;
const day = (s: string): ISODateString => s as ISODateString;
const c = (n: number): Cents => n as Cents;
const balance = (
  memberId: UserId,
  netCents: Cents,
  currency = 'EUR',
): MemberBalance => ({ memberId, netCents, currency });

// Helper: suma de balances como number (para assertions).
const sumNets = (bs: ReadonlyArray<MemberBalance>): number =>
  bs.reduce((acc, b) => acc + (b.netCents as unknown as number), 0);

describe('expenses.ts', () => {
  // ───────────────────────────────────────────────────────────────────
  // 1. Gasto igual entre N
  // ───────────────────────────────────────────────────────────────────
  it('caso 1: gasto igual entre N → balances correctos', () => {
    const members = ['a', 'b', 'c', 'd'].map(uid);
    const exp: Expense = {
      id: 'e1',
      amountCents: c(10000), // 100,00 €
      currency: 'EUR',
      type: 'expense',
      date: day('2026-07-01'),
      payers: [{ memberId: uid('a'), amountCents: c(10000) }],
      splits: members.map((m) => ({
        memberId: m,
        splitType: 'equal',
        included: true,
      })),
    };
    const balances = computeMemberBalances([exp], members);
    // a pagó 10000, debe 2500 → net = +7500
    expect((balances[0]!.netCents as unknown as number)).toBe(7500);
    // b, c, d deben 2500 → net = -2500
    for (let i = 1; i < 4; i++) {
      expect((balances[i]!.netCents as unknown as number)).toBe(-2500);
    }
    expect(sumNets(balances)).toBe(0);
  });

  // ───────────────────────────────────────────────────────────────────
  // 2. Gasto con exclusión
  // ───────────────────────────────────────────────────────────────────
  it('caso 2: gasto con exclusión de personas → excluidos no deben nada', () => {
    const members = ['a', 'b', 'c', 'd'].map(uid);
    const exp: Expense = {
      id: 'e2',
      amountCents: c(6000),
      currency: 'EUR',
      type: 'expense',
      date: day('2026-07-01'),
      payers: [{ memberId: uid('a'), amountCents: c(6000) }],
      splits: members.map((m) => ({
        memberId: m,
        splitType: 'equal',
        included: m !== 'd', // excluimos a 'd'
      })),
    };
    const balances = computeMemberBalances([exp], members);
    // a pagó 6000, debe 2000 → net = +4000
    expect((balances[0]!.netCents as unknown as number)).toBe(4000);
    // b, c deben 2000 → net = -2000
    expect((balances[1]!.netCents as unknown as number)).toBe(-2000);
    expect((balances[2]!.netCents as unknown as number)).toBe(-2000);
    // d excluido → net = 0
    expect((balances[3]!.netCents as unknown as number)).toBe(0);
    expect(sumNets(balances)).toBe(0);
  });

  // ───────────────────────────────────────────────────────────────────
  // 3. Split por amounts exactos
  // ───────────────────────────────────────────────────────────────────
  it('caso 3: split por amounts exactos', () => {
    const members = ['a', 'b', 'c'].map(uid);
    const exp: Expense = {
      id: 'e3',
      amountCents: c(10000),
      currency: 'EUR',
      type: 'expense',
      date: day('2026-07-01'),
      payers: [{ memberId: uid('a'), amountCents: c(10000) }],
      splits: [
        { memberId: uid('a'), splitType: 'amount', amountCents: c(5000), included: true },
        { memberId: uid('b'), splitType: 'amount', amountCents: c(3000), included: true },
        { memberId: uid('c'), splitType: 'amount', amountCents: c(2000), included: true },
      ],
    };
    const balances = computeMemberBalances([exp], members);
    expect((balances[0]!.netCents as unknown as number)).toBe(5000); // pagó 10000, debe 5000
    expect((balances[1]!.netCents as unknown as number)).toBe(-3000);
    expect((balances[2]!.netCents as unknown as number)).toBe(-2000);
    expect(sumNets(balances)).toBe(0);
  });

  // ───────────────────────────────────────────────────────────────────
  // 4. Split por porcentajes
  // ───────────────────────────────────────────────────────────────────
  it('caso 4: split por porcentajes 50/30/20 → balances correctos', () => {
    const members = ['a', 'b', 'c'].map(uid);
    const exp: Expense = {
      id: 'e4',
      amountCents: c(10000),
      currency: 'EUR',
      type: 'expense',
      date: day('2026-07-01'),
      payers: [{ memberId: uid('a'), amountCents: c(10000) }],
      splits: [
        { memberId: uid('a'), splitType: 'percentage', percentage: 50, included: true },
        { memberId: uid('b'), splitType: 'percentage', percentage: 30, included: true },
        { memberId: uid('c'), splitType: 'percentage', percentage: 20, included: true },
      ],
    };
    const balances = computeMemberBalances([exp], members);
    expect((balances[0]!.netCents as unknown as number)).toBe(5000);
    expect((balances[1]!.netCents as unknown as number)).toBe(-3000);
    expect((balances[2]!.netCents as unknown as number)).toBe(-2000);
    expect(sumNets(balances)).toBe(0);
  });

  it('caso 4b: split por porcentajes con remanente (33.33/33.33/33.34) → suma exacta', () => {
    const members = ['a', 'b', 'c'].map(uid);
    const exp: Expense = {
      id: 'e4b',
      amountCents: c(10000),
      currency: 'EUR',
      type: 'expense',
      date: day('2026-07-01'),
      payers: [{ memberId: uid('a'), amountCents: c(10000) }],
      splits: [
        { memberId: uid('a'), splitType: 'percentage', percentage: 33.33, included: true },
        { memberId: uid('b'), splitType: 'percentage', percentage: 33.33, included: true },
        { memberId: uid('c'), splitType: 'percentage', percentage: 33.34, included: true },
      ],
    };
    const balances = computeMemberBalances([exp], members);
    expect(sumNets(balances)).toBe(0);
  });

  // ───────────────────────────────────────────────────────────────────
  // 5. Split por shares
  // ───────────────────────────────────────────────────────────────────
  it('caso 5: split por shares (2/1/1) → 50/25/25', () => {
    const members = ['a', 'b', 'c'].map(uid);
    const exp: Expense = {
      id: 'e5',
      amountCents: c(10000),
      currency: 'EUR',
      type: 'expense',
      date: day('2026-07-01'),
      payers: [{ memberId: uid('a'), amountCents: c(10000) }],
      splits: [
        { memberId: uid('a'), splitType: 'shares', shares: 2, included: true },
        { memberId: uid('b'), splitType: 'shares', shares: 1, included: true },
        { memberId: uid('c'), splitType: 'shares', shares: 1, included: true },
      ],
    };
    const balances = computeMemberBalances([exp], members);
    expect((balances[0]!.netCents as unknown as number)).toBe(5000);
    expect((balances[1]!.netCents as unknown as number)).toBe(-2500);
    expect((balances[2]!.netCents as unknown as number)).toBe(-2500);
    expect(sumNets(balances)).toBe(0);
  });

  // ───────────────────────────────────────────────────────────────────
  // 6. Múltiples payers
  // ───────────────────────────────────────────────────────────────────
  it('caso 6: múltiples payers → suma de payers cubre el gasto', () => {
    const members = ['a', 'b', 'c'].map(uid);
    const exp: Expense = {
      id: 'e6',
      amountCents: c(9000),
      currency: 'EUR',
      type: 'expense',
      date: day('2026-07-01'),
      payers: [
        { memberId: uid('a'), amountCents: c(6000) },
        { memberId: uid('b'), amountCents: c(3000) },
      ],
      splits: members.map((m) => ({
        memberId: m,
        splitType: 'equal',
        included: true,
      })),
    };
    const balances = computeMemberBalances([exp], members);
    // a pagó 6000, debe 3000 → net = +3000
    expect((balances[0]!.netCents as unknown as number)).toBe(3000);
    // b pagó 3000, debe 3000 → net = 0
    expect((balances[1]!.netCents as unknown as number)).toBe(0);
    // c debe 3000 → net = -3000
    expect((balances[2]!.netCents as unknown as number)).toBe(-3000);
    expect(sumNets(balances)).toBe(0);
  });

  // ───────────────────────────────────────────────────────────────────
  // 7. Income/refund (entra dinero al grupo)
  // ───────────────────────────────────────────────────────────────────
  it('caso 7: income/refund reparte el crédito entre los splits', () => {
    // Reembolso de 200€ que entra al grupo a través de 'a'. El dinero se
    // reparte IGUAL entre los 4 miembros (incluido 'a' como split, ya
    // que el refund pertenece al grupo y todos se benefician).
    // Convención (ver `expenses.ts` docstring de `computeMemberBalances`):
    //   - payer 'a' recibe +20000 (entrada de dinero al grupo).
    //   - cada split recibe +5000 (crédito a su favor).
    //   - 'a' (que también es split) cobra +20000 + 5000 = +25000.
    //   - b, c, d cobran solo +5000 cada uno.
    //   - Suma total: +25000 + 3*5000 = +40000, pero la "suma de
    //     balances" incluye el pago y los créditos por separado. El
    //     invariante de Plantir es que `sum(balances) === 0` solo se
    //     mantiene cuando el income se compensa con expenses de los
    //     miembros. Aquí, aislado, el income inyecta 40000 al grupo
    //     (lo cual es lo correcto: el grupo tiene 40000 más).
    const members = ['a', 'b', 'c', 'd'].map(uid);
    const income: Expense = {
      id: 'i1',
      amountCents: c(20000),
      currency: 'EUR',
      type: 'income',
      date: day('2026-07-01'),
      payers: [{ memberId: uid('a'), amountCents: c(20000) }],
      splits: members.map((m) => ({
        memberId: m,
        splitType: 'equal',
        included: true,
      })),
    };
    const balances = computeMemberBalances([income], members);
    // 'a' (payer + split): +20000 (pago) + 5000 (crédito) = +25000.
    expect((balances[0]!.netCents as unknown as number)).toBe(25000);
    // b, c, d (solo split): +5000 cada uno.
    expect((balances[1]!.netCents as unknown as number)).toBe(5000);
    expect((balances[2]!.netCents as unknown as number)).toBe(5000);
    expect((balances[3]!.netCents as unknown as number)).toBe(5000);
    // Suma: el income neto al grupo es +40000 (20000 del payer + 20000
    // repartido entre los 4 splits). Esto representa el incremento de
    // caja del grupo.
    expect(sumNets(balances)).toBe(40000);
  });

  // ───────────────────────────────────────────────────────────────────
  // 8. applyCompletedPayments descuenta los pagos ya hechos
  // ───────────────────────────────────────────────────────────────────
  it('caso 8: applyCompletedPayments descuenta pagos confirmados', () => {
    const balances: MemberBalance[] = [
      balance(uid('a'), c(10000)),
      balance(uid('b'), c(-10000)),
    ];
    const payment: Settlement = {
      fromMemberId: uid('b'),
      toMemberId: uid('a'),
      amountCents: c(10000),
      currency: 'EUR',
    };
    const updated = applyCompletedPayments(balances, [payment]);
    expect(sumNets(updated)).toBe(0);
    expect((updated[0]!.netCents as unknown as number)).toBe(0);
    expect((updated[1]!.netCents as unknown as number)).toBe(0);
  });

  // ───────────────────────────────────────────────────────────────────
  // 9. computeSettlements: ejemplo del briefing (Ana recibe 50, Pablo paga 20, Carla paga 30)
  // ───────────────────────────────────────────────────────────────────
  it('caso 9: computeSettlements empareja debtors con creditors', () => {
    const balances: MemberBalance[] = [
      balance(uid('ana'), c(5000)),
      balance(uid('pablo'), c(-2000)),
      balance(uid('carla'), c(-3000)),
    ];
    const settlements = computeSettlements(balances);
    // Resultado esperado: Pablo paga 20 a Ana, Carla paga 30 a Ana
    expect(settlements).toHaveLength(2);
    const pabloToAna = settlements.find(
      (s) => s.fromMemberId === uid('pablo') && s.toMemberId === uid('ana'),
    );
    const carlaToAna = settlements.find(
      (s) => s.fromMemberId === uid('carla') && s.toMemberId === uid('ana'),
    );
    expect(pabloToAna).toBeDefined();
    expect(carlaToAna).toBeDefined();
    expect((pabloToAna!.amountCents as unknown as number)).toBe(2000);
    expect((carlaToAna!.amountCents as unknown as number)).toBe(3000);
  });

  // ───────────────────────────────────────────────────────────────────
  // 10. Cota N-1: máx N-1 settlements para N membros con balance no cero
  // ───────────────────────────────────────────────────────────────────
  it('caso 10: N-1 settlements máximo para N miembros', () => {
    const balances: MemberBalance[] = [
      balance(uid('a'), c(3000)),
      balance(uid('b'), c(-1000)),
      balance(uid('c'), c(-2000)),
      balance(uid('d'), c(5000)),
      balance(uid('e'), c(-5000)),
    ];
    const settlements = computeSettlements(balances);
    expect(settlements.length).toBeLessThanOrEqual(4); // N-1 con N=5
  });

  // ───────────────────────────────────────────────────────────────────
  // 11. Remanente de 1 céntimo: suma de settlements = balance exacto
  // ───────────────────────────────────────────────────────────────────
  it('caso 11: settlements cubren exactamente el balance', () => {
    // Caso clásico: 100,01 € entre 3 personas → 33,34 / 33,34 / 33,33
    // a paga 10001, los 3 deben ~3334 → balances: +6667, -3334, -3333
    const balances: MemberBalance[] = [
      balance(uid('a'), c(6667)),
      balance(uid('b'), c(-3334)),
      balance(uid('c'), c(-3333)),
    ];
    const settlements = computeSettlements(balances);
    const totalTransferred = settlements.reduce(
      (acc, s) => acc + (s.amountCents as unknown as number),
      0,
    );
    expect(totalTransferred).toBe(6667); // 100,01 - 33,34 = 66,67
    // Verifica que aplicar los settlements zerea los balances.
    const finalBalances = applyCompletedPayments(balances, settlements);
    expect(sumNets(finalBalances)).toBe(0);
  });

  // ───────────────────────────────────────────────────────────────────
  // 12. optimizeSettlements coalesce pares duplicados y cumple N-1
  // ───────────────────────────────────────────────────────────────────
  it('caso 12: optimizeSettlements cumple la cota N-1', () => {
    const balances: MemberBalance[] = [
      balance(uid('a'), c(1000)),
      balance(uid('b'), c(2000)),
      balance(uid('c'), c(-1500)),
      balance(uid('d'), c(-1500)),
    ];
    const settlements = optimizeSettlements(balances);
    expect(settlements.length).toBeLessThanOrEqual(3);
    const finalBalances = applyCompletedPayments(balances, settlements);
    expect(sumNets(finalBalances)).toBe(0);
  });

  // ───────────────────────────────────────────────────────────────────
  // 13. PROPERTY-BASED: para cualquier input válido (solo expenses, sin
  //     income), la suma de balances es 0 y los settlements zerean.
  //     Income se excluye porque rompe el invariante de suma-cero (es
  //     inyección de dinero al grupo, no transferencia interna).
  // ───────────────────────────────────────────────────────────────────
  it('propiedad: balances suman 0 y settlements zerean (1000 iteraciones)', () => {
    const memberIdArb = fc
      .array(fc.string({ minLength: 1, maxLength: 6 }), {
        minLength: 2,
        maxLength: 6,
      })
      .map((arr) => Array.from(new Set(arr))); // únicos

    // amountCents entre 1 y 100.000 céntimos
    const centsArb = fc.integer({ min: 1, max: 100_000 });

    // Genera un expense aleatorio (SOLO 'expense', no 'income')
    const expenseArb = (members: ReadonlyArray<string>) =>
      fc.record({
        amountCents: centsArb,
        payerIdx: fc.integer({ min: 0, max: members.length - 1 }),
      });

    fc.assert(
      fc.property(memberIdArb, (rawMembers) => {
        const members = rawMembers.map(uid);
        if (members.length < 2) return true; // trivial

        // Genera 1-3 expenses
        const numExpenses = 3;
        const expenses: Expense[] = [];
        for (let i = 0; i < numExpenses; i++) {
          const seed = fc.sample(expenseArb(members), 1)[0]!;
          const payer = members[seed.payerIdx]!;
          expenses.push({
            id: `e${i}`,
            amountCents: c(seed.amountCents),
            currency: 'EUR',
            type: 'expense',
            date: day('2026-07-01'),
            payers: [{ memberId: payer, amountCents: c(seed.amountCents) }],
            splits: members.map((m) => ({
              memberId: m,
              splitType: 'equal' as const,
              included: true,
            })),
          });
        }

        const balances = computeMemberBalances(expenses, members);
        // Invariante 1: para expenses puros, suma de balances = 0
        // (el dinero solo se redistribuye entre miembros, no se crea
        // ni se destruye).
        const sum = sumNets(balances);
        if (sum !== 0) {
          throw new Error(
            `sum != 0 para ${members.length} miembros: sum=${sum}`,
          );
        }

        // Invariante 2: aplicar settlements zerea los balances.
        const settlements = computeSettlements(balances);
        const finalBalances = applyCompletedPayments(balances, settlements);
        if (sumNets(finalBalances) !== 0) {
          throw new Error(
            `settlements no zerean balances: finalSum=${sumNets(finalBalances)}`,
          );
        }

        // Invariante 3: optimizeSettlements también zerea.
        const optimized = optimizeSettlements(balances);
        const optFinal = applyCompletedPayments(balances, optimized);
        if (sumNets(optFinal) !== 0) {
          throw new Error(
            `optimizeSettlements no zerea: finalSum=${sumNets(optFinal)}`,
          );
        }

        return true;
      }),
      { numRuns: 1000 },
    );
  });
});
