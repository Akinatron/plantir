import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { LoadingState } from '../../../../src/components/feedback/LoadingState';
import { PlaceholderState } from '../../../../src/components/feedback/PlaceholderState';
import { AppText } from '../../../../src/components/ui/AppText';
import { Screen } from '../../../../src/components/ui/Screen';
import { useExpenseDetailQuery } from '../../../../src/hooks/useExpenses';
import { useTripMembersQuery } from '../../../../src/hooks/useTrips';
import { formatCents } from '../../../../src/lib/algorithms/money';

export default function ExpenseDetailScreen() {
  const { tripId, expenseId } = useLocalSearchParams<{ tripId: string; expenseId: string }>();
  const detailQuery = useExpenseDetailQuery(expenseId);
  const membersQuery = useTripMembersQuery(tripId);

  if (detailQuery.isLoading || membersQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading expense..." />
      </Screen>
    );
  }

  if (!detailQuery.data) {
    return (
      <Screen>
        <PlaceholderState title="Expense unavailable" description="This expense does not exist or is not accessible." />
      </Screen>
    );
  }

  const { expense, payers, splits } = detailQuery.data;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <AppText variant="eyebrow">Expense</AppText>
          <AppText variant="title">{expense.title}</AppText>
          <AppText>{formatCents(expense.amountCents, expense.currencyCode)}</AppText>
          <AppText>{expense.expenseDate}{expense.category ? ` · ${expense.category}` : ''}</AppText>
        </View>

        {expense.description ? <AppText>{expense.description}</AppText> : null}

        <View style={styles.section}>
          <AppText variant="subtitle">Paid by</AppText>
          {payers.map((payer) => (
            <InfoRow
              key={payer.id}
              label={memberName(membersQuery.data ?? [], payer.userId)}
              value={formatCents(payer.amountCents, expense.currencyCode)}
            />
          ))}
        </View>

        <View style={styles.section}>
          <AppText variant="subtitle">Split</AppText>
          {splits.map((split) => (
            <InfoRow
              key={split.id}
              label={memberName(membersQuery.data ?? [], split.userId)}
              value={formatCents(split.amountCents, expense.currencyCode)}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText>{label}</AppText>
      <AppText>{value}</AppText>
    </View>
  );
}

function memberName(members: { userId: string; displayName: string | null }[], userId: string): string {
  return members.find((member) => member.userId === userId)?.displayName ?? 'Unknown member';
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingVertical: 24,
  },
  header: {
    gap: 8,
  },
  section: {
    gap: 10,
  },
  row: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAECF0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
});
