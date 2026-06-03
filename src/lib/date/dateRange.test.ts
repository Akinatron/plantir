import { expandIsoDateRange, expandIsoDateRanges } from './dateRange';

describe('date range utilities', () => {
  it('expands an inclusive ISO date range', () => {
    expect(expandIsoDateRange('2026-07-01', '2026-07-03')).toEqual([
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
    ]);
  });

  it('deduplicates and sorts multiple ranges', () => {
    expect(
      expandIsoDateRanges([
        { startDate: '2026-07-03', endDate: '2026-07-04' },
        { startDate: '2026-07-01', endDate: '2026-07-03' },
      ]),
    ).toEqual(['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04']);
  });

  it('rejects a reversed date range', () => {
    expect(() => expandIsoDateRange('2026-07-04', '2026-07-01')).toThrow(
      'startDate must be before or equal to endDate.',
    );
  });
});
