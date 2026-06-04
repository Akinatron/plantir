import { useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../../src/components/feedback/LoadingState';
import { PlaceholderState } from '../../../../src/components/feedback/PlaceholderState';
import { AppText } from '../../../../src/components/ui/AppText';
import { Button } from '../../../../src/components/ui/Button';
import { Card } from '../../../../src/components/ui/Card';
import { Screen } from '../../../../src/components/ui/Screen';
import {
  useComputeTripBalancesMutation,
  useMarkSettlementPaidMutation,
  useSettlementPaymentsQuery,
  useSettlementSuggestionsQuery,
} from '../../../../src/hooks/useExpenses';
import { useTripMembersQuery } from '../../../../src/hooks/useTrips';
import { formatCents } from '../../../../src/lib/algorithms/money';
import { confirmAction } from '../../../../src/lib/ui/confirmAction';
import { SettlementSuggestion } from '../../../../src/types/expense';

export default function SettlementsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const membersQuery = useTripMembersQuery(tripId);
  const suggestionsQuery = useSettlementSuggestionsQuery(tripId);
  const paymentsQuery = useSettlementPaymentsQuery(tripId);
  const computeMutation = useComputeTripBalancesMutation(tripId);
  const markPaidMutation = useMarkSettlementPaidMutation(tripId);
  const suggestions = computeMutation.data?.settlements ?? suggestionsQuery.data ?? [];

  if (membersQuery.isLoading || suggestionsQuery.isLoading || paymentsQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading settlements..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="eyebrow">Settlements</AppText>
            <AppText variant="title">Suggested payments</AppText>
            <AppText>Suggestions are optimized from current balances and paid settlements.</AppText>

            {suggestionsQuery.error ? (
              <InlineNotice title="Settlements failed to load" message={suggestionsQuery.error.message} tone="error" />
            ) : null}

            {markPaidMutation.error ? (
              <InlineNotice title="Payment failed" message={markPaidMutation.error.message} tone="error" />
            ) : null}

            {markPaidMutation.isSuccess ? <InlineNotice title="Payment marked paid" tone="success" /> : null}

            <Button
              label={computeMutation.isPending ? 'Refreshing...' : 'Refresh suggestions'}
              onPress={() => computeMutation.mutate()}
              disabled={computeMutation.isPending}
            />

            {paymentsQuery.data && paymentsQuery.data.length > 0 ? (
              <AppText>{paymentsQuery.data.filter((payment) => payment.status === 'paid').length} completed payments</AppText>
            ) : null}
          </View>
        }
        contentContainerStyle={styles.list}
        data={suggestions}
        keyExtractor={(suggestion) => suggestion.id}
        ListEmptyComponent={
          <PlaceholderState title="No settlements" description="Balances are already settled or need to be refreshed." />
        }
        renderItem={({ item }) => (
          <SettlementRow
            suggestion={item}
            fromName={memberName(membersQuery.data ?? [], item.fromUserId)}
            toName={memberName(membersQuery.data ?? [], item.toUserId)}
            onMarkPaid={() =>
              confirmAction({
                title: 'Mark settlement paid?',
                message: 'This records a completed payment and updates current balances. It does not delete the original expenses.',
                confirmLabel: 'Mark paid',
                onConfirm: () => markPaidMutation.mutate({ suggestionId: item.id }),
              })
            }
            disabled={markPaidMutation.isPending}
          />
        )}
      />
    </Screen>
  );
}

function SettlementRow({
  suggestion,
  fromName,
  toName,
  onMarkPaid,
  disabled,
}: {
  suggestion: SettlementSuggestion;
  fromName: string;
  toName: string;
  onMarkPaid: () => void;
  disabled: boolean;
}) {
  return (
    <Card>
      <AppText variant="subtitle">
        {fromName} pays {toName}
      </AppText>
      <AppText>{formatCents(suggestion.amountCents, suggestion.currencyCode)}</AppText>
      <Button label="Mark paid" variant="secondary" onPress={onMarkPaid} disabled={disabled} />
    </Card>
  );
}

function memberName(members: { userId: string; displayName: string | null }[], userId: string): string {
  return members.find((member) => member.userId === userId)?.displayName ?? 'Unknown member';
}

const styles = StyleSheet.create({
  header: {
    gap: 12,
    paddingTop: 24,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
});
