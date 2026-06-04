import { Link, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../../src/components/feedback/LoadingState';
import { PlaceholderState } from '../../../../src/components/feedback/PlaceholderState';
import { AppText } from '../../../../src/components/ui/AppText';
import { Button } from '../../../../src/components/ui/Button';
import { Screen } from '../../../../src/components/ui/Screen';
import { useExpensesQuery } from '../../../../src/hooks/useExpenses';
import { formatCents } from '../../../../src/lib/algorithms/money';
import { Expense } from '../../../../src/types/expense';

export default function ExpensesListScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const expensesQuery = useExpensesQuery(tripId);

  if (expensesQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading expenses..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <AppText variant="eyebrow">Expenses</AppText>
              <AppText variant="title">Trip costs</AppText>
            </View>

            {expensesQuery.error ? (
              <InlineNotice title="Expenses failed to load" message={expensesQuery.error.message} tone="error" />
            ) : null}

            <View style={styles.actions}>
              <Link href={`/trips/${tripId}/expenses/create`} asChild>
                <Button label="Add expense" />
              </Link>
              <Link href={`/trips/${tripId}/expenses/balances`} asChild>
                <Button label="Balances" variant="secondary" />
              </Link>
              <Link href={`/trips/${tripId}/expenses/settlements`} asChild>
                <Button label="Settlements" variant="secondary" />
              </Link>
            </View>
          </View>
        }
        contentContainerStyle={styles.list}
        data={expensesQuery.data ?? []}
        keyExtractor={(expense) => expense.id}
        ListEmptyComponent={
          <PlaceholderState title="No expenses yet" description="Add shared costs as the trip takes shape." />
        }
        renderItem={({ item }) => <ExpenseRow expense={item} tripId={tripId} />}
      />
    </Screen>
  );
}

function ExpenseRow({ expense, tripId }: { expense: Expense; tripId: string }) {
  return (
    <Link href={`/trips/${tripId}/expenses/${expense.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open expense ${expense.title}, ${formatCents(expense.amountCents, expense.currencyCode)}`}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <AppText variant="subtitle">{expense.title}</AppText>
        <AppText>{formatCents(expense.amountCents, expense.currencyCode)}</AppText>
        <AppText>{expense.expenseDate}{expense.category ? ` / ${expense.category}` : ''}</AppText>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 16,
    paddingTop: 24,
  },
  actions: {
    gap: 10,
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
  pressed: {
    opacity: 0.82,
  },
});
