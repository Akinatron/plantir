export type CurrencyCode = string;

export type Allocation = {
  id: string;
  amountCents: number;
};

export type ShareInput = {
  id: string;
  shares: number;
};

export type PercentageInput = {
  id: string;
  basisPoints: number;
};

export function assertIntegerCents(amountCents: number, fieldName = 'amountCents'): void {
  if (!Number.isSafeInteger(amountCents)) {
    throw new Error(`${fieldName} must be a safe integer number of cents.`);
  }
}

export function assertPositiveCents(amountCents: number, fieldName = 'amountCents'): void {
  assertIntegerCents(amountCents, fieldName);

  if (amountCents <= 0) {
    throw new Error(`${fieldName} must be greater than zero.`);
  }
}

export function assertNonNegativeCents(amountCents: number, fieldName = 'amountCents'): void {
  assertIntegerCents(amountCents, fieldName);

  if (amountCents < 0) {
    throw new Error(`${fieldName} must be zero or greater.`);
  }
}

export function normalizeCurrencyCode(currencyCode: CurrencyCode): CurrencyCode {
  const normalized = currencyCode.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error('currencyCode must be an ISO 4217-style 3-letter code.');
  }

  return normalized;
}

export function addCents(...amounts: number[]): number {
  return amounts.reduce((sum, amount) => {
    assertIntegerCents(amount);
    return sum + amount;
  }, 0);
}

export function subtractCents(left: number, right: number): number {
  assertIntegerCents(left, 'left');
  assertIntegerCents(right, 'right');
  return left - right;
}

export function allocateEvenly(totalCents: number, ids: readonly string[]): Allocation[] {
  assertNonNegativeCents(totalCents, 'totalCents');

  if (ids.length === 0) {
    if (totalCents === 0) {
      return [];
    }

    throw new Error('Cannot allocate a positive amount across zero recipients.');
  }

  const baseAmount = Math.trunc(totalCents / ids.length);
  const remainder = totalCents % ids.length;

  return ids.map((id, index) => ({
    id,
    amountCents: baseAmount + (index < remainder ? 1 : 0),
  }));
}

export function allocateByShares(totalCents: number, shares: readonly ShareInput[]): Allocation[] {
  assertNonNegativeCents(totalCents, 'totalCents');

  const totalShares = shares.reduce((sum, item) => {
    if (!Number.isSafeInteger(item.shares) || item.shares < 0) {
      throw new Error('shares must be safe non-negative integers.');
    }

    return sum + item.shares;
  }, 0);

  if (shares.length === 0 || totalShares === 0) {
    if (totalCents === 0) {
      return shares.map((item) => ({ id: item.id, amountCents: 0 }));
    }

    throw new Error('Cannot allocate a positive amount without positive shares.');
  }

  const provisional = shares.map((item, index) => {
    const numerator = totalCents * item.shares;
    const amountCents = Math.trunc(numerator / totalShares);
    const remainder = numerator % totalShares;

    return { id: item.id, amountCents, remainder, index };
  });

  const allocated = provisional.reduce((sum, item) => sum + item.amountCents, 0);
  let centsLeft = totalCents - allocated;
  const byRemainder = [...provisional].sort((left, right) => {
    if (right.remainder !== left.remainder) {
      return right.remainder - left.remainder;
    }

    return left.index - right.index;
  });

  for (const item of byRemainder) {
    if (centsLeft <= 0) {
      break;
    }

    item.amountCents += 1;
    centsLeft -= 1;
  }

  const byId = new Map(byRemainder.map((item) => [item.id, item.amountCents]));
  return shares.map((item) => ({ id: item.id, amountCents: byId.get(item.id) ?? 0 }));
}

export function allocateByPercentages(
  totalCents: number,
  percentages: readonly PercentageInput[],
): Allocation[] {
  const totalBasisPoints = percentages.reduce((sum, item) => {
    if (!Number.isSafeInteger(item.basisPoints) || item.basisPoints < 0) {
      throw new Error('basisPoints must be safe non-negative integers.');
    }

    return sum + item.basisPoints;
  }, 0);

  if (totalBasisPoints !== 10_000) {
    throw new Error('Percentages must add up to exactly 10000 basis points.');
  }

  return allocateByShares(
    totalCents,
    percentages.map((item) => ({ id: item.id, shares: item.basisPoints })),
  );
}

export function sumAllocations(allocations: readonly Allocation[]): number {
  return allocations.reduce((sum, allocation) => addCents(sum, allocation.amountCents), 0);
}

export function parseMoneyToCents(value: string): number {
  const trimmed = value.trim();
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(trimmed);

  if (!match) {
    throw new Error('Money value must be a decimal string with at most two decimal places.');
  }

  const sign = match[1] === '-' ? -1 : 1;
  const whole = match[2];
  const decimal = (match[3] ?? '').padEnd(2, '0');
  const cents = Number(`${whole}${decimal}`);

  assertIntegerCents(cents, 'parsed cents');
  return sign * cents;
}

export function formatCents(amountCents: number, currencyCode: CurrencyCode): string {
  assertIntegerCents(amountCents);
  const normalizedCurrency = normalizeCurrencyCode(currencyCode);
  const sign = amountCents < 0 ? '-' : '';
  const absolute = Math.abs(amountCents);
  const whole = Math.trunc(absolute / 100);
  const cents = String(absolute % 100).padStart(2, '0');

  return `${sign}${whole}.${cents} ${normalizedCurrency}`;
}
