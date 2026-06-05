import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';
import { DatePollResult } from '../../types/datePoll';

type DateRankingListProps = {
  results: DatePollResult[];
  isComputing?: boolean;
  canCompute?: boolean;
  onCompute?: () => void;
  selectedResultId?: string | null;
  onSelectResult: (result: DatePollResult) => void;
};

export function DateRankingList({
  results,
  isComputing = false,
  canCompute = false,
  onCompute,
  selectedResultId,
  onSelectResult,
}: DateRankingListProps) {
  const topResults = results.slice(0, 10);

  if (topResults.length === 0) {
    return (
      <Card variant="soft" padding="lg">
        <EmptyState
          title="No ranking yet"
          description="Compute results after members save availability."
        />
        {canCompute && onCompute ? (
          <Button
            label={isComputing ? 'Computing...' : 'Compute ranking'}
            onPress={onCompute}
            loading={isComputing}
            disabled={isComputing}
          />
        ) : null}
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="subtitle">Ranked date ranges</AppText>
          <AppText variant="body">Tap a range to see who is counted for it.</AppText>
        </View>
        {canCompute && onCompute ? (
          <Button
            label={isComputing ? 'Refreshing...' : 'Refresh'}
            variant="secondary"
            fullWidth={false}
            onPress={onCompute}
            loading={isComputing}
            disabled={isComputing}
          />
        ) : null}
      </View>

      <View style={styles.list}>
        {topResults.map((result) => {
          const selected = result.id === selectedResultId;

          return (
            <Pressable
              key={result.id}
              accessibilityRole="button"
              accessibilityLabel={`Rank ${result.rank}, ${formatDateRange(result.startDate, result.endDate)}`}
              accessibilityState={{ selected }}
              onPress={() => onSelectResult(result)}
              style={[styles.row, selected && styles.rowSelected]}
            >
              <View style={styles.rank}>
                <AppText variant="label" style={styles.rankLabel}>
                  {result.rank}
                </AppText>
              </View>
              <View style={styles.rowCopy}>
                <AppText variant="bodyStrong">{formatDateRange(result.startDate, result.endDate)}</AppText>
                <AppText variant="caption">
                  {result.durationDays} days · {result.availableMemberCount}/{result.totalMemberCount} available
                </AppText>
              </View>
              <AppText variant="label" style={styles.percent}>
                {formatPercentage(result.availablePercentage)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

function formatDateRange(startDate: string, endDate: string) {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

function formatPercentage(value: number) {
  return `${Math.round(value <= 1 ? value * 100 : value)}%`;
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
  list: {
    gap: spacing[2],
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[3],
  },
  rowSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  rank: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSun,
    borderRadius: radius.full,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  rankLabel: {
    color: colors.warning,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  percent: {
    color: colors.primary,
  },
});
