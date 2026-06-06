import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';
import { typography } from '../../design/typography';
import { AppText } from './AppText';
import { Button } from './Button';
import { TextField } from './TextField';

type CalendarDateFieldProps = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
  allowClear?: boolean;
  disabled?: boolean;
};

type CalendarDateTimeFieldProps = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
  allowClear?: boolean;
  disabled?: boolean;
};

const weekDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const millisecondsPerDay = 24 * 60 * 60 * 1000;

export function CalendarDateField({
  label,
  value,
  onChange,
  error,
  allowClear = true,
  disabled = false,
}: CalendarDateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(parseIsoDate(value) ?? new Date()));
  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

  return (
    <View style={styles.container}>
      <AppText variant="eyebrow">{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value ? `${label}: ${formatDisplayDate(value)}` : `${label}: no date selected`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setIsOpen((current) => !current)}
        style={[styles.valueButton, error && styles.valueButtonError, disabled && styles.disabled]}
      >
        <AppText style={[styles.valueText, !value && styles.placeholder]}>
          {value ? formatDisplayDate(value) : 'Select date'}
        </AppText>
      </Pressable>
      {error ? <AppText style={styles.error}>{error}</AppText> : null}

      {isOpen && !disabled ? (
        <View style={styles.calendarPanel}>
          <View style={styles.monthHeader}>
            <Button
              label="<"
              variant="secondary"
              size="sm"
              fullWidth={false}
              accessibilityLabel="Previous month"
              onPress={() => setVisibleMonth((current) => addMonths(current, -1))}
              style={styles.monthButton}
            />
            <AppText variant="subtitle" style={styles.monthTitle}>
              {formatMonth(visibleMonth)}
            </AppText>
            <Button
              label=">"
              variant="secondary"
              size="sm"
              fullWidth={false}
              accessibilityLabel="Next month"
              onPress={() => setVisibleMonth((current) => addMonths(current, 1))}
              style={styles.monthButton}
            />
          </View>

          <View style={styles.weekGrid}>
            {weekDayLabels.map((day) => (
              <AppText key={day} style={styles.weekDay}>
                {day}
              </AppText>
            ))}
          </View>

          <View style={styles.dayGrid}>
            {days.map((day) => {
              const isoDate = toIsoDate(day);
              const selected = value === isoDate;
              const muted = day.getUTCMonth() !== visibleMonth.getUTCMonth();

              return (
                <Pressable
                  key={isoDate}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${formatDisplayDate(isoDate)}`}
                  onPress={() => {
                    onChange(isoDate);
                    setIsOpen(false);
                  }}
                  style={[styles.dayButton, selected && styles.dayButtonSelected]}
                >
                  <AppText style={[styles.dayText, muted && styles.dayTextMuted, selected && styles.dayTextSelected]}>
                    {day.getUTCDate()}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.calendarActions}>
            <Button
              label="Today"
              variant="secondary"
              fullWidth={false}
              onPress={() => {
                const today = toIsoDate(new Date());
                onChange(today);
                setVisibleMonth(startOfMonth(new Date()));
                setIsOpen(false);
              }}
            />
            {allowClear ? (
              <Button
                label="Clear"
                variant="ghost"
                fullWidth={false}
                onPress={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
              />
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function CalendarDateTimeField({
  label,
  value,
  onChange,
  error,
  allowClear = true,
  disabled = false,
}: CalendarDateTimeFieldProps) {
  const dateValue = value ? formatLocalDate(value) : null;
  const timeValue = value ? formatLocalTime(value) : '12:00';

  return (
    <View style={styles.container}>
      <CalendarDateField
        label={label}
        value={dateValue}
        error={error}
        allowClear={allowClear}
        disabled={disabled}
        onChange={(nextDate) => {
          onChange(nextDate ? buildIsoDateTime(nextDate, timeValue) : null);
        }}
      />
      {dateValue ? (
        <TextField
          label="Time"
          placeholder="12:00"
          value={timeValue}
          editable={!disabled}
          onChangeText={(nextTime) => {
            if (isValidTime(nextTime)) {
              onChange(buildIsoDateTime(dateValue, nextTime));
            }
          }}
        />
      ) : null}
    </View>
  );
}

function buildCalendarDays(month: Date): Date[] {
  const firstDay = startOfMonth(month);
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7;
  const firstCalendarDay = new Date(firstDay.getTime() - mondayOffset * millisecondsPerDay);

  return Array.from({ length: 42 }, (_, index) => new Date(firstCalendarDay.getTime() + index * millisecondsPerDay));
}

function parseIsoDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parts = value.split('-').map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, amount: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function toIsoDate(date: Date): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString().slice(0, 10);
}

function formatDisplayDate(value: string): string {
  const parsed = parseIsoDate(value);

  if (!parsed) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(parsed);
}

function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(date);
}

function formatLocalTime(value: string): string {
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatLocalDate(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function buildIsoDateTime(date: string, time: string): string {
  const normalizedTime = isValidTime(time) ? time : '12:00';
  return new Date(`${date}T${normalizedTime}:00`).toISOString();
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
  },
  valueButton: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  valueButtonError: {
    borderColor: colors.danger,
  },
  disabled: {
    backgroundColor: colors.surfaceSoft,
    opacity: 0.72,
  },
  valueText: {
    ...typography.body,
    color: colors.text,
  },
  placeholder: {
    color: colors.textSubtle,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  calendarPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing[3],
    padding: spacing[3],
  },
  monthHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'space-between',
  },
  monthButton: {
    minHeight: 40,
    minWidth: 44,
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
  },
  weekGrid: {
    flexDirection: 'row',
  },
  weekDay: {
    ...typography.caption,
    color: colors.textSubtle,
    flex: 1,
    fontWeight: '700',
    textAlign: 'center',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayButton: {
    alignItems: 'center',
    aspectRatio: 1,
    justifyContent: 'center',
    padding: 2,
    width: `${100 / 7}%`,
  },
  dayButtonSelected: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  dayText: {
    ...typography.label,
    color: colors.text,
    fontWeight: '700',
  },
  dayTextMuted: {
    color: colors.textSubtle,
  },
  dayTextSelected: {
    color: colors.primaryText,
  },
  calendarActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
});
