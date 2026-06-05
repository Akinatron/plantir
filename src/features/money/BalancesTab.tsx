import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { ArrowDownLeft, ArrowUpRight, RefreshCcw } from 'lucide-react-native';

import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';
import { formatCents } from '../../lib/algorithms/money';
import { ComputeTripBalancesResult, TripBalance } from '../../types/expense';
import { TripMember } from '../../types/trip';
import { memberName } from './moneyUtils';

type BalancesTabProps = {
  currentUserId: string | null | undefined;
  balances?: ComputeTripBalancesResult;
  members: TripMember[];
  isLoading: boolean;
  refreshing?: boolean;
  error?: Error | null;
  onRefresh: () => void;
};

export function BalancesTab({
  currentUserId,
  balances,
  members,
  isLoading,
  refreshing = false,
  error,
  onRefresh,
}: BalancesTabProps) {
  const rows = balances?.balances ?? [];
  const currentRows = rows.filter((balance) => balance.memberId === currentUserId);
  const owed = currentRows.filter((balance) => balance.balanceCents > 0);
  const owe = currentRows.filter((balance) => balance.balanceCents < 0);

  if (isLoading) {
    return <LoadingState label="Computing balances..." />;
  }

  return (
    <View style={styles.container}>
      {error ? <ErrorState title="Balances failed to load" message={error.message} /> : null}

      <View style={styles.summaryGrid}>
        <SummaryCard
          title="You owe"
          rows={owe}
          tone="coral"
          icon={<ArrowUpRight color={colors.coral} size={20} />}
          emptyLabel="Nothing"
        />
        <SummaryCard
          title="You are owed"
          rows={owed}
          tone="sea"
          icon={<ArrowDownLeft color={colors.primary} size={20} />}
          emptyLabel="Nothing"
        />
      </View>

      <Button
        label="Refresh balances"
        variant="secondary"
        loading={refreshing}
        onPress={onRefresh}
        leftIcon={<RefreshCcw color={colors.primary} size={18} />}
      />

      <View style={styles.section}>
        <AppText variant="subtitle">Group balances</AppText>
        {rows.length === 0 ? (
          <EmptyState title="No balances" description="Add expenses to calculate balances." />
        ) : (
          rows.map((balance) => (
            <BalanceRow
              key={`${balance.memberId}:${balance.currencyCode}`}
              balance={balance}
              memberName={memberName(members, balance.memberId)}
            />
          ))
        )}
      </View>
    </View>
  );
}

function SummaryCard({
  title,
  rows,
  tone,
  icon,
  emptyLabel,
}: {
  title: string;
  rows: TripBalance[];
  tone: 'sea' | 'coral';
  icon: ReactNode;
  emptyLabel: string;
}) {
  return (
    <Card variant="elevated" style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        {icon}
        <AppText variant="bodyStrong">{title}</AppText>
      </View>
      {rows.length === 0 ? (
        <AppText variant="title" style={tone === 'sea' ? styles.seaText : styles.coralText}>
          {emptyLabel}
        </AppText>
      ) : (
        rows.map((row) => (
          <AppText key={`${row.memberId}:${row.currencyCode}`} variant="title" style={tone === 'sea' ? styles.seaText : styles.coralText}>
            {formatCents(Math.abs(row.balanceCents), row.currencyCode)}
          </AppText>
        ))
      )}
    </Card>
  );
}

function BalanceRow({ balance, memberName: name }: { balance: TripBalance; memberName: string }) {
  const settled = balance.balanceCents === 0;
  const positive = balance.balanceCents > 0;

  return (
    <View style={styles.balanceRow}>
      <View>
        <AppText variant="bodyStrong">{name}</AppText>
        <AppText variant="caption">{settled ? 'Settled' : positive ? 'Is owed' : 'Owes'}</AppText>
      </View>
      <AppText variant="bodyStrong" style={positive ? styles.seaText : balance.balanceCents < 0 ? styles.coralText : undefined}>
        {formatCents(Math.abs(balance.balanceCents), balance.currencyCode)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[5],
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  summaryCard: {
    flexBasis: 220,
    flexGrow: 1,
  },
  summaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  section: {
    gap: spacing[3],
  },
  balanceRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
    minHeight: 68,
    padding: spacing[3],
  },
  seaText: {
    color: colors.primary,
  },
  coralText: {
    color: colors.coral,
  },
});
