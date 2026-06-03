const millisecondsPerDay = 86_400_000;

export function expandIsoDateRange(startDate: string, endDate: string): string[] {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);

  if (start.getTime() > end.getTime()) {
    throw new Error('startDate must be before or equal to endDate.');
  }

  const dayCount = Math.trunc((end.getTime() - start.getTime()) / millisecondsPerDay) + 1;

  return Array.from({ length: dayCount }, (_, index) =>
    new Date(start.getTime() + index * millisecondsPerDay).toISOString().slice(0, 10),
  );
}

export function expandIsoDateRanges(ranges: { startDate: string; endDate: string }[]): string[] {
  return [...new Set(ranges.flatMap((range) => expandIsoDateRange(range.startDate, range.endDate)))].sort();
}

function parseIsoDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid ISO date: ${value}`);
  }

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid calendar date: ${value}`);
  }

  return date;
}
