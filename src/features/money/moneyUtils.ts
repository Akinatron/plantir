import { TripMember } from '../../types/trip';

export function memberName(members: TripMember[], userId: string): string {
  return members.find((member) => member.userId === userId)?.displayName ?? 'Unknown member';
}

export function formatExpenseDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(parsed);
}

export function formatShortDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(parsed);
}

export function groupByExpenseDate<TItem extends { expenseDate: string }>(
  items: TItem[],
): { date: string; items: TItem[] }[] {
  const grouped = new Map<string, TItem[]>();

  for (const item of items) {
    grouped.set(item.expenseDate, [...(grouped.get(item.expenseDate) ?? []), item]);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => Date.parse(`${right}T00:00:00Z`) - Date.parse(`${left}T00:00:00Z`))
    .map(([date, groupedItems]) => ({ date, items: groupedItems }));
}
