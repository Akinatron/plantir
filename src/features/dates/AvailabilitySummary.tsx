import { CalendarDays } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';

type AvailabilitySummaryProps = {
  availableCount: number;
  totalDays: number;
  deadlineAt?: string | null;
  hasVoted: boolean;
  disabled?: boolean;
  onEdit: () => void;
};

export function AvailabilitySummary({
  availableCount,
  totalDays,
  deadlineAt,
  hasVoted,
  disabled = false,
  onEdit,
}: AvailabilitySummaryProps) {
  return (
    <Card variant="soft" padding="lg" style={styles.card}>
      <View style={styles.iconWrap}>
        <CalendarDays color={colors.primary} size={22} strokeWidth={2.2} />
      </View>
      <View style={styles.copy}>
        <AppText variant="subtitle">{hasVoted ? 'Availability saved' : 'No availability yet'}</AppText>
        <AppText variant="body">
          {hasVoted
            ? `${availableCount} of ${totalDays} allowed days marked available.`
            : 'Mark the days you can travel. Unmarked days are treated as not available.'}
        </AppText>
        {deadlineAt ? <AppText variant="caption">Deadline: {formatDateTime(deadlineAt)}</AppText> : null}
      </View>
      <Button
        label={hasVoted ? 'Edit availability' : 'Add availability'}
        onPress={onEdit}
        disabled={disabled}
        fullWidth={false}
      />
    </Card>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  });
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSea,
    borderRadius: radius.lg,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  copy: {
    flex: 1,
    gap: spacing[1],
    minWidth: 220,
  },
});
