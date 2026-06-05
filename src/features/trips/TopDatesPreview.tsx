import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';
import { DatePollResult } from '../../types/datePoll';

type TopDatesPreviewProps = {
  href: string;
  results: DatePollResult[];
  isLoading?: boolean;
  error?: Error | null;
  hasPoll?: boolean;
};

export function TopDatesPreview({ href, results, isLoading = false, error, hasPoll = false }: TopDatesPreviewProps) {
  const topResults = results.slice(0, 3);

  return (
    <Card variant="elevated" padding="lg" style={styles.card}>
      <PreviewHeader title="Top dates" href={href} cta={hasPoll ? 'Open dates' : 'Start poll'} />

      {isLoading ? <LoadingState label="Loading date results..." /> : null}

      {!isLoading && error ? (
        <EmptyState title="Dates hidden" description="Results are unavailable or hidden by trip settings." />
      ) : null}

      {!isLoading && !error && topResults.length === 0 ? (
        <EmptyState
          title={hasPoll ? 'No date ranking yet' : 'No date poll yet'}
          description={hasPoll ? 'Collect votes, then compute results.' : 'Create a date poll when the group is ready.'}
        />
      ) : null}

      {!isLoading && !error && topResults.length > 0 ? (
        <View style={styles.list}>
          {topResults.map((result) => (
            <View key={result.id} style={styles.row}>
              <View style={styles.rank}>
                <AppText variant="label" style={styles.rankLabel}>
                  {result.rank}
                </AppText>
              </View>
              <View style={styles.rowCopy}>
                <AppText variant="bodyStrong">{formatDateRange(result.startDate, result.endDate)}</AppText>
                <AppText variant="caption">
                  {result.availableMemberCount}/{result.totalMemberCount} available
                </AppText>
              </View>
              <AppText variant="label" style={styles.percent}>
                {Math.round(result.availablePercentage)}%
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function PreviewHeader({ title, href, cta }: { title: string; href: string; cta: string }) {
  return (
    <View style={styles.header}>
      <AppText variant="subtitle">{title}</AppText>
      <Link href={href} asChild>
        <Pressable accessibilityRole="button" accessibilityLabel={cta} style={styles.headerLink}>
          <AppText variant="label" style={styles.headerLinkText}>
            {cta}
          </AppText>
        </Pressable>
      </Link>
    </View>
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

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 280,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
  },
  headerLink: {
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  headerLinkText: {
    color: colors.primary,
  },
  list: {
    gap: spacing[3],
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
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
