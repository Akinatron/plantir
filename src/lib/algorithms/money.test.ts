import {
  allocateByPercentages,
  allocateByShares,
  allocateEvenly,
  formatCents,
  parseMoneyToCents,
} from './money';

describe('money algorithms', () => {
  it('allocates cents evenly with deterministic remainders', () => {
    expect(allocateEvenly(100, ['a', 'b', 'c'])).toEqual([
      { id: 'a', amountCents: 34 },
      { id: 'b', amountCents: 33 },
      { id: 'c', amountCents: 33 },
    ]);
  });

  it('allocates by shares and gives largest remainders first', () => {
    expect(
      allocateByShares(101, [
        { id: 'a', shares: 1 },
        { id: 'b', shares: 1 },
        { id: 'c', shares: 1 },
      ]),
    ).toEqual([
      { id: 'a', amountCents: 34 },
      { id: 'b', amountCents: 34 },
      { id: 'c', amountCents: 33 },
    ]);
  });

  it('requires percentages to add to 10000 basis points', () => {
    expect(() =>
      allocateByPercentages(1000, [
        { id: 'a', basisPoints: 5000 },
        { id: 'b', basisPoints: 4000 },
      ]),
    ).toThrow('10000');
  });

  it('parses and formats money without floating point input', () => {
    expect(parseMoneyToCents('12.30')).toBe(1230);
    expect(parseMoneyToCents('-0.05')).toBe(-5);
    expect(formatCents(-1230, 'eur')).toBe('-12.30 EUR');
  });

  it('rejects decimal strings with more than two decimal places', () => {
    expect(() => parseMoneyToCents('10.999')).toThrow('at most two');
  });
});
