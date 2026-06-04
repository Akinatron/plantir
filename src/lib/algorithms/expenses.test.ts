import {
  buildExpenseSplits,
  computeBalances,
  computeBalancesAndSettlements,
  suggestSettlements,
} from './expenses';

describe('expense algorithms', () => {
  it('splits equally while excluding selected members', () => {
    const splits = buildExpenseSplits({
      id: 'e1',
      kind: 'expense',
      amountCents: 1000,
      currencyCode: 'EUR',
      payers: [{ memberId: 'a', amountCents: 1000 }],
      split: {
        type: 'equal',
        participantIds: ['a', 'b', 'c'],
        excludedMemberIds: ['c'],
      },
    });

    expect(splits).toEqual([
      { memberId: 'a', amountCents: 500 },
      { memberId: 'b', amountCents: 500 },
    ]);
  });

  it('supports exact, percentage, and shares split validation', () => {
    expect(
      buildExpenseSplits({
        id: 'e1',
        kind: 'expense',
        amountCents: 999,
        currencyCode: 'EUR',
        payers: [{ memberId: 'a', amountCents: 999 }],
        split: {
          type: 'percentage',
          percentages: [
            { id: 'a', basisPoints: 3333 },
            { id: 'b', basisPoints: 3333 },
            { id: 'c', basisPoints: 3334 },
          ],
        },
      }),
    ).toEqual([
      { memberId: 'a', amountCents: 333 },
      { memberId: 'b', amountCents: 333 },
      { memberId: 'c', amountCents: 333 },
    ]);

    expect(() =>
      buildExpenseSplits({
        id: 'e2',
        kind: 'expense',
        amountCents: 100,
        currencyCode: 'EUR',
        payers: [{ memberId: 'a', amountCents: 100 }],
        split: { type: 'exact', amounts: [{ id: 'a', amountCents: 99 }] },
      }),
    ).toThrow('Exact split amounts');
  });

  it('computes balances for multiple payers', () => {
    const balances = computeBalances({
      memberIds: ['a', 'b', 'c'],
      expenses: [
        {
          id: 'e1',
          kind: 'expense',
          amountCents: 900,
          currencyCode: 'EUR',
          payers: [
            { memberId: 'a', amountCents: 600 },
            { memberId: 'b', amountCents: 300 },
          ],
          split: { type: 'equal', participantIds: ['a', 'b', 'c'] },
        },
      ],
    });

    expect(balances).toEqual([
      { memberId: 'a', currencyCode: 'EUR', balanceCents: 300 },
      { memberId: 'b', currencyCode: 'EUR', balanceCents: 0 },
      { memberId: 'c', currencyCode: 'EUR', balanceCents: -300 },
    ]);
  });

  it('treats income/refund as the inverse of an expense', () => {
    const balances = computeBalances({
      memberIds: ['a', 'b'],
      expenses: [
        {
          id: 'r1',
          kind: 'refund',
          amountCents: 200,
          currencyCode: 'EUR',
          payers: [{ memberId: 'a', amountCents: 200 }],
          split: { type: 'equal', participantIds: ['a', 'b'] },
        },
      ],
    });

    expect(balances).toEqual([
      { memberId: 'a', currencyCode: 'EUR', balanceCents: -100 },
      { memberId: 'b', currencyCode: 'EUR', balanceCents: 100 },
    ]);
  });

  it('applies completed settlement payments to reduce balances', () => {
    const balances = computeBalances({
      memberIds: ['a', 'b'],
      expenses: [
        {
          id: 'e1',
          kind: 'expense',
          amountCents: 1000,
          currencyCode: 'EUR',
          payers: [{ memberId: 'a', amountCents: 1000 }],
          split: { type: 'equal', participantIds: ['a', 'b'] },
        },
      ],
      completedSettlementPayments: [
        { fromMemberId: 'b', toMemberId: 'a', amountCents: 500, currencyCode: 'EUR' },
      ],
    });

    expect(balances).toEqual([
      { memberId: 'a', currencyCode: 'EUR', balanceCents: 0 },
      { memberId: 'b', currencyCode: 'EUR', balanceCents: 0 },
    ]);
  });

  it('suggests optimized settlements by currency', () => {
    const settlements = suggestSettlements([
      { memberId: 'a', currencyCode: 'EUR', balanceCents: 700 },
      { memberId: 'b', currencyCode: 'EUR', balanceCents: -300 },
      { memberId: 'c', currencyCode: 'EUR', balanceCents: -400 },
    ]);

    expect(settlements).toEqual([
      { fromMemberId: 'c', toMemberId: 'a', amountCents: 400, currencyCode: 'EUR' },
      { fromMemberId: 'b', toMemberId: 'a', amountCents: 300, currencyCode: 'EUR' },
    ]);
  });

  it('computes balances and settlements together', () => {
    const result = computeBalancesAndSettlements({
      memberIds: ['a', 'b'],
      expenses: [
        {
          id: 'e1',
          kind: 'expense',
          amountCents: 1000,
          currencyCode: 'EUR',
          payers: [{ memberId: 'a', amountCents: 1000 }],
          split: { type: 'equal', participantIds: ['a', 'b'] },
        },
      ],
    });

    expect(result.settlements).toEqual([
      { fromMemberId: 'b', toMemberId: 'a', amountCents: 500, currencyCode: 'EUR' },
    ]);
  });

  it('produces final balances that sum to zero per currency', () => {
    const balances = computeBalances({
      memberIds: ['a', 'b', 'c'],
      expenses: [
        {
          id: 'e1',
          kind: 'expense',
          amountCents: 1200,
          currencyCode: 'EUR',
          payers: [{ memberId: 'a', amountCents: 1200 }],
          split: { type: 'equal', participantIds: ['a', 'b', 'c'] },
        },
        {
          id: 'e2',
          kind: 'expense',
          amountCents: 300,
          currencyCode: 'EUR',
          payers: [{ memberId: 'b', amountCents: 300 }],
          split: { type: 'equal', participantIds: ['a', 'b', 'c'] },
        },
      ],
    });

    expect(balances.reduce((sum, balance) => sum + balance.balanceCents, 0)).toBe(0);
  });

  it('rejects payer totals that do not match the expense amount', () => {
    expect(() =>
      computeBalances({
        memberIds: ['a'],
        expenses: [
          {
            id: 'e1',
            kind: 'expense',
            amountCents: 100,
            currencyCode: 'EUR',
            payers: [{ memberId: 'a', amountCents: 99 }],
            split: { type: 'equal', participantIds: ['a'] },
          },
        ],
      }),
    ).toThrow('Payer amounts');
  });
});
