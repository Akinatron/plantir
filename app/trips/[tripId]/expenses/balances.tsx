import { useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../../src/components/feedback/LoadingState';
import { PlaceholderState } from '../../../../src/components/feedback/PlaceholderState';
import { AppText } from '../../../../src/components/ui/AppText';
import { Button } from '../../../../src/components/ui/Button';
import { Screen } from '../../../../src/components/ui/Screen';
import { useComputeTripBalancesMutation, useTripBalancesQuery } from '../../../../src/hooks/useExpenses';
import { useTripMembersQuery } from '../../../../src/hooks/useTrips';
import { formatCents } from '../../../../src/lib/algorithms/money';
import { TripBalance } from '../../../../src/types/expense';

export default function BalancesScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const balancesQuery = useTripBalancesQuery(tripId);
  const membersQuery = useTripMembersQuery(tripId);
  const computeMutation = useComputeTripBalancesMutation(tripId);
  const balances = computeMutation.data?.balances ?? balancesQuery.data?.balances ?? [];

  if (balancesQuery.isLoading || membersQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Computing balances..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="eyebrow">Balances</AppText>
            <AppText variant="title">Current balances</AppText>
            <AppText>Paid settlement payments are included in these balances.</AppText>

            {balancesQuery.error ? (
              <InlineNotice title="Balances failed to load" message={balancesQuery.error.message} tone="error" />
            ) : null}

            {computeMutation.error ? (
              <InlineNotice title="Balances failed to refresh" message={computeMutation.error.message} tone="error" />
            ) : null}

            {computeMutation.isSuccess ? <InlineNotice title="Balances refreshed" tone="success" /> : null}

            <Button
              label={computeMutation.isPending ? 'Refreshing...' : 'Refresh balances'}
              onPress={() => computeMutation.mutate()}
              disabled={computeMutation.isPending}
            />
          </View>
        }
        contentContainerStyle={styles.list}
        data={balances}
        keyExtractor={(balance) => `${balance.memberId}:${balance.currencyCode}`}
        ListEmptyComponent={<PlaceholderState title="No balances" description="Add expenses to calculate balances." />}
        renderItem={({ item }) => (
          <BalanceRow
            balance={item}
            memberName={membersQuery.data?.find((member) => member.userId === item.memberId)?.displayName ?? 'Unknown member'}
          />
        )}
      />
    </Screen>
  );
}

function BalanceRow({ balance, memberName }: { balance: TripBalance; memberName: string }) {
  const label =
    balance.balanceCents > 0 ? 'is owed' : balance.balanceCents < 0 ? 'owes' : 'settled';
  return (
    <View style={styles.card}>
      <AppText variant="subtitle">{memberName}</AppText>
      <AppText>
        {label} {formatCents(Math.abs(balance.balanceCents), balance.currencyCode)}
      </AppText>
    </View>
  );
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
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAECF0',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
});
