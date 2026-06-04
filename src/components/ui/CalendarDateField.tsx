import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Button } from './Button';
import { TextField } from './TextField';

type CalendarDateFieldProps = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
  allowClear?: boolean;
};

type CalendarDateTimeFieldProps = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
  allowClear?: boolean;
};

const weekDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const millisecondsPerDay = 24 * 60 * 60 * 1000;

export function CalendarDateField({
  label,
  value,
  onChange,
  error,
  allowClear = true,
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
        onPress={() => setIsOpen((current) => !current)}
        style={[styles.valueButton, error && styles.valueButtonError]}
      >
        <AppText style={[styles.valueText, !value && styles.placeholder]}>
          {value ? formatDisplayDate(value) : 'Select date'}
        </AppText>
      </Pressable>
      {error ? <AppText style={styles.error}>{error}</AppText> : null}

      {isOpen ? (
        <View style={styles.calendarPanel}>
          <View style={styles.monthHeader}>
            <Button
              label="<"
              variant="secondary"
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
                variant="secondary"
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
        onChange={(nextDate) => {
          onChange(nextDate ? buildIsoDateTime(nextDate, timeValue) : null);
        }}
      />
      {dateValue ? (
        <TextField
          label="Time"
          placeholder="12:00"
          value={timeValue}
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
    gap: 8,
  },
  valueButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  valueButtonError: {
    borderColor: '#B42318',
  },
  valueText: {
    color: '#101828',
  },
  placeholder: {
    color: '#667085',
  },
  error: {
    color: '#B42318',
    fontSize: 13,
    lineHeight: 18,
  },
  calendarPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 12,
  },
  monthHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  monthButton: {
    minHeight: 40,
    minWidth: 44,
    paddingHorizontal: 10,
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
  },
  weekGrid: {
    flexDirection: 'row',
  },
  weekDay: {
    color: '#667085',
    flex: 1,
    fontSize: 12,
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
    width: `${100 / 7}%`,
  },
  dayButtonSelected: {
    backgroundColor: '#0F6B57',
    borderRadius: 8,
  },
  dayText: {
    color: '#101828',
    fontWeight: '700',
  },
  dayTextMuted: {
    color: '#98A2B3',
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  calendarActions: {
    flexDirection: 'row',
    gap: 10,
  },
});
