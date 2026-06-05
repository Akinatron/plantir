import { StyleSheet, View } from 'react-native';
import { RefreshCcw } from 'lucide-react-native';

import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { colors } from '../../design/theme';
import { spacing } from '../../design/spacing';
import { confirmAction } from '../../lib/ui/confirmAction';
import { SettlementPayment, SettlementSuggestion } from '../../types/expense';
import { Trip, TripMember } from '../../types/trip';
import { memberName } from './moneyUtils';
import { SettlementRow } from './SettlementRow';

type SettlementsTabProps = {
  trip: Trip | null | undefined;
  currentUserId: string | null | undefined;
  members: TripMember[];
  suggestions: SettlementSuggestion[];
  payments: SettlementPayment[];
  isLoading: boolean;
  refreshing?: boolean;
  markingPaid?: boolean;
  error?: Error | null;
  markPaidError?: Error | null;
  onRefresh: () => void;
  onMarkPaid: (suggestionId: string) => void;
};

export function SettlementsTab({
  trip,
  currentUserId,
  members,
  suggestions,
  payments,
  isLoading,
  refreshing = false,
  markingPaid = false,
  error,
  markPaidError,
  onRefresh,
  onMarkPaid,
}: SettlementsTabProps) {
  if (isLoading) {
    return <LoadingState label="Loading settlements..." />;
  }

  const paidPayments = payments.filter((payment) => payment.status === 'paid');

  return (
    <View style={styles.container}>
      {error ? <ErrorState title="Settlements failed to load" message={error.message} /> : null}
      {markPaidError ? <ErrorState title="Payment failed" message={markPaidError.message} /> : null}

      <Card variant="soft">
        <View style={styles.headerCard}>
          <View style={styles.headerCopy}>
            <AppText variant="subtitle">Optimized payments</AppText>
            <AppText>These suggestions reduce the number of payments while keeping original expenses untouched.</AppText>
          </View>
          <Button
            label="Refresh"
            variant="secondary"
            fullWidth={false}
            loading={refreshing}
            onPress={onRefresh}
            leftIcon={<RefreshCcw color={colors.primary} size={18} />}
          />
        </View>
        {paidPayments.length > 0 ? (
          <AppText variant="caption">{paidPayments.length} completed payments included in current balances.</AppText>
        ) : null}
      </Card>

      {suggestions.length === 0 ? (
        <EmptyState title="No settlements" description="Balances are already settled or need to be refreshed." />
      ) : (
        suggestions.map((suggestion) => (
          <SettlementRow
            key={suggestion.id}
            suggestion={suggestion}
            fromName={memberName(members, suggestion.fromUserId)}
            toName={memberName(members, suggestion.toUserId)}
            canMarkPaid={canMarkSettlementPaid(trip, members, currentUserId, suggestion)}
            disabled={markingPaid}
            onMarkPaid={() =>
              confirmAction({
                title: 'Mark settlement paid?',
                message:
                  'This records a completed payment and updates current balances. It does not delete the original expenses.',
                confirmLabel: 'Mark paid',
                onConfirm: () => onMarkPaid(suggestion.id),
              })
            }
          />
        ))
      )}
    </View>
  );
}

function canMarkSettlementPaid(
  trip: Trip | null | undefined,
  members: TripMember[],
  userId: string | null | undefined,
  suggestion: SettlementSuggestion,
): boolean {
  if (!trip || !userId || trip.closedAt) {
    return false;
  }

  const role = members.find((member) => member.userId === userId)?.role;
  const isAdmin = role === 'owner' || role === 'admin';

  if (isAdmin) {
    return true;
  }

  if (trip.settlementMarkPaidPolicy === 'participants') {
    return suggestion.fromUserId === userId || suggestion.toUserId === userId;
  }

  return false;
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[4],
  },
  headerCard: {
    alignItems: 'center',
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
});
