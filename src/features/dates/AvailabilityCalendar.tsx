import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';

type AvailabilityCalendarProps = {
  days: string[];
  selectedDates: Set<string>;
  disabled?: boolean;
  isSaving?: boolean;
  onToggleDate: (date: string) => void;
  onSave: () => void;
  onCancel?: () => void;
};

export function AvailabilityCalendar({
  days,
  selectedDates,
  disabled = false,
  isSaving = false,
  onToggleDate,
  onSave,
  onCancel,
}: AvailabilityCalendarProps) {
  const monthGroups = groupDaysByMonth(days);

  return (
    <Card variant="elevated" padding="lg" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="subtitle">Your availability</AppText>
          <AppText variant="body">Tap every day that works for you. Leave the rest unmarked.</AppText>
        </View>
        <AppText variant="label" style={styles.count}>
          {selectedDates.size} selected
        </AppText>
      </View>

      {monthGroups.map((group) => (
        <View key={group.monthKey} style={styles.month}>
          <AppText variant="bodyStrong">{group.label}</AppText>
          <View style={styles.dayGrid}>
            {group.days.map((day) => {
              const selected = selectedDates.has(day);

              return (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatFullDate(day)} ${selected ? 'selected' : 'not selected'}`}
                  accessibilityState={{ disabled, selected }}
                  disabled={disabled}
                  onPress={() => onToggleDate(day)}
                  style={[styles.dayButton, selected && styles.dayButtonSelected, disabled && styles.disabled]}
                >
                  <AppText style={[styles.dayNumber, selected && styles.dayNumberSelected]}>
                    {new Date(`${day}T00:00:00`).getDate()}
                  </AppText>
                  <AppText variant="caption" style={[styles.weekday, selected && styles.dayNumberSelected]}>
                    {formatWeekday(day)}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <View style={styles.actions}>
        {onCancel ? <Button label="Cancel" variant="ghost" fullWidth={false} onPress={onCancel} /> : null}
        <Button
          label={isSaving ? 'Saving...' : 'Save availability'}
          onPress={onSave}
          disabled={disabled || isSaving}
          loading={isSaving}
          fullWidth={false}
        />
      </View>
    </Card>
  );
}

function groupDaysByMonth(days: string[]) {
  const groups = new Map<string, string[]>();

  days.forEach((day) => {
    const monthKey = day.slice(0, 7);
    groups.set(monthKey, [...(groups.get(monthKey) ?? []), day]);
  });

  return Array.from(groups.entries()).map(([monthKey, groupedDays]) => ({
    days: groupedDays,
    label: new Date(`${monthKey}-01T00:00:00`).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    }),
    monthKey,
  }));
}

function formatWeekday(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
}

function formatFullDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[5],
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    gap: spacing[1],
    minWidth: 220,
  },
  count: {
    color: colors.primary,
  },
  month: {
    gap: spacing[3],
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  dayButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    minWidth: 58,
    paddingHorizontal: spacing[2],
  },
  dayButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  disabled: {
    opacity: 0.58,
  },
  dayNumber: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  dayNumberSelected: {
    color: colors.primaryText,
  },
  weekday: {
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    justifyContent: 'flex-end',
  },
});
