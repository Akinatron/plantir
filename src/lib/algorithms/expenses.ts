import {
  Allocation,
  allocateByPercentages,
  allocateByShares,
  allocateEvenly,
  assertPositiveCents,
  normalizeCurrencyCode,
  sumAllocations,
} from './money';

export type MemberId = string;

export type ExpenseKind = 'expense' | 'income' | 'refund';

export type PayerInput = {
  memberId: MemberId;
  amountCents: number;
};

export type EqualSplit = {
  type: 'equal';
  participantIds: MemberId[];
  excludedMemberIds?: MemberId[];
};

export type ExactSplit = {
  type: 'exact';
  amounts: Allocation[];
};

export type PercentageSplit = {
  type: 'percentage';
  percentages: {
    id: MemberId;
    basisPoints: number;
  }[];
};

export type SharesSplit = {
  type: 'shares';
  shares: {
    id: MemberId;
    shares: number;
  }[];
};

export type ExpenseSplitInput = EqualSplit | ExactSplit | PercentageSplit | SharesSplit;

export type ExpenseInput = {
  id: string;
  kind: ExpenseKind;
  amountCents: number;
  currencyCode: string;
  payers: PayerInput[];
  split: ExpenseSplitInput;
  isVoided?: boolean;
};

export type CompletedSettlementPayment = {
  fromMemberId: MemberId;
  toMemberId: MemberId;
  amountCents: number;
  currencyCode: string;
};

export type ExpenseSplitResult = {
  memberId: MemberId;
  amountCents: number;
};

export type Balance = {
  memberId: MemberId;
  currencyCode: string;
  balanceCents: number;
};

export type SettlementSuggestion = {
  fromMemberId: MemberId;
  toMemberId: MemberId;
  amountCents: number;
  currencyCode: string;
};

export type ComputeBalancesInput = {
  memberIds: MemberId[];
  expenses: ExpenseInput[];
  completedSettlementPayments?: CompletedSettlementPayment[];
};

export function buildExpenseSplits(expense: ExpenseInput): ExpenseSplitResult[] {
  assertPositiveCents(expense.amountCents, 'expense.amountCents');

  if (expense.split.type === 'equal') {
    const excluded = new Set(expense.split.excludedMemberIds ?? []);
    const included = expense.split.participantIds.filter((memberId) => !excluded.has(memberId));
    return allocateEvenly(expense.amountCents, included).map(toSplitResult);
  }

  if (expense.split.type === 'exact') {
    const total = sumAllocations(expense.split.amounts);

    if (total !== expense.amountCents) {
      throw new Error('Exact split amounts must equal expense amount.');
    }

    return expense.split.amounts.map(toSplitResult);
  }

  if (expense.split.type === 'percentage') {
    return allocateByPercentages(expense.amountCents, expense.split.percentages).map(toSplitResult);
  }

  return allocateByShares(expense.amountCents, expense.split.shares).map(toSplitResult);
}

export function computeBalances(input: ComputeBalancesInput): Balance[] {
  const memberIds = [...new Set(input.memberIds)].sort();
  const balances = new Map<string, number>();
  const currencyByKey = new Map<string, string>();

  for (const memberId of memberIds) {
    balances.set(memberId, 0);
  }

  for (const expense of input.expenses) {
    if (expense.isVoided) {
      continue;
    }

    const currencyCode = normalizeCurrencyCode(expense.currencyCode);
    validatePayers(expense);
    const splits = buildExpenseSplits(expense);
    const sign = expense.kind === 'expense' ? 1 : -1;

    for (const payer of expense.payers) {
      addBalance(balances, currencyByKey, payer.memberId, currencyCode, sign * payer.amountCents);
    }

    for (const split of splits) {
      addBalance(balances, currencyByKey, split.memberId, currencyCode, -sign * split.amountCents);
    }
  }

  for (const payment of input.completedSettlementPayments ?? []) {
    const currencyCode = normalizeCurrencyCode(payment.currencyCode);
    assertPositiveCents(payment.amountCents, 'settlement.amountCents');
    addBalance(balances, currencyByKey, payment.fromMemberId, currencyCode, payment.amountCents);
    addBalance(balances, currencyByKey, payment.toMemberId, currencyCode, -payment.amountCents);
  }

  return [...balances.entries()]
    .map(([key, balanceCents]) => {
      const [memberId = '', currencyCode = ''] = key.split(':');
      return {
        memberId,
        currencyCode,
        balanceCents,
      };
    })
    .filter((balance) => balance.currencyCode.length > 0)
    .sort((left, right) => left.currencyCode.localeCompare(right.currencyCode) || left.memberId.localeCompare(right.memberId));
}

export function suggestSettlements(balances: readonly Balance[]): SettlementSuggestion[] {
  const byCurrency = groupBalancesByCurrency(balances);
  const suggestions: SettlementSuggestion[] = [];

  for (const [currencyCode, currencyBalances] of byCurrency.entries()) {
    const debtors = currencyBalances
      .filter((balance) => balance.balanceCents < 0)
      .map((balance) => ({ ...balance, amountCents: -balance.balanceCents }))
      .sort((left, right) => right.amountCents - left.amountCents || left.memberId.localeCompare(right.memberId));
    const creditors = currencyBalances
      .filter((balance) => balance.balanceCents > 0)
      .map((balance) => ({ ...balance, amountCents: balance.balanceCents }))
      .sort((left, right) => right.amountCents - left.amountCents || left.memberId.localeCompare(right.memberId));

    let debtorIndex = 0;
    let creditorIndex = 0;

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];

      if (!debtor || !creditor) {
        break;
      }

      const amountCents = Math.min(debtor.amountCents, creditor.amountCents);

      if (amountCents > 0) {
        suggestions.push({
          fromMemberId: debtor.memberId,
          toMemberId: creditor.memberId,
          amountCents,
          currencyCode,
        });
      }

      debtor.amountCents -= amountCents;
      creditor.amountCents -= amountCents;

      if (debtor.amountCents === 0) {
        debtorIndex += 1;
      }

      if (creditor.amountCents === 0) {
        creditorIndex += 1;
      }
    }
  }

  return suggestions;
}

export function computeBalancesAndSettlements(input: ComputeBalancesInput): {
  balances: Balance[];
  settlements: SettlementSuggestion[];
} {
  const balances = computeBalances(input);
  return {
    balances,
    settlements: suggestSettlements(balances),
  };
}

function validatePayers(expense: ExpenseInput): void {
  const totalPaid = expense.payers.reduce((sum, payer) => {
    assertPositiveCents(payer.amountCents, 'payer.amountCents');
    return sum + payer.amountCents;
  }, 0);

  if (totalPaid !== expense.amountCents) {
    throw new Error('Payer amounts must equal expense amount.');
  }
}

function toSplitResult(allocation: Allocation): ExpenseSplitResult {
  return {
    memberId: allocation.id,
    amountCents: allocation.amountCents,
  };
}

function addBalance(
  balances: Map<string, number>,
  currencyByKey: Map<string, string>,
  memberId: MemberId,
  currencyCode: string,
  deltaCents: number,
): void {
  const key = `${memberId}:${currencyCode}`;
  balances.set(key, (balances.get(key) ?? 0) + deltaCents);
  currencyByKey.set(key, currencyCode);
}

function groupBalancesByCurrency(balances: readonly Balance[]): Map<string, Balance[]> {
  const grouped = new Map<string, Balance[]>();

  for (const balance of balances) {
    const currencyBalances = grouped.get(balance.currencyCode) ?? [];
    currencyBalances.push(balance);
    grouped.set(balance.currencyCode, currencyBalances);
  }

  return grouped;
}
