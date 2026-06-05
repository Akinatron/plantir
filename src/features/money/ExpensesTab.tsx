import { StyleSheet, View } from 'react-native';
import { Plus } from 'lucide-react-native';

import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { colors } from '../../design/theme';
import { spacing } from '../../design/spacing';
import { Expense } from '../../types/expense';
import { ExpenseRow } from './ExpenseRow';
import { formatExpenseDate, groupByExpenseDate } from './moneyUtils';

type ExpensesTabProps = {
  tripId: string;
  expenses: Expense[];
  isLoading: boolean;
  error?: Error | null;
  onAddExpense: () => void;
};

export function ExpensesTab({ tripId, expenses, isLoading, error, onAddExpense }: ExpensesTabProps) {
  const grouped = groupByExpenseDate(expenses);

  if (isLoading) {
    return <LoadingState label="Loading expenses..." />;
  }

  return (
    <View style={styles.container}>
      {error ? <ErrorState title="Expenses failed to load" message={error.message} /> : null}

      <Card variant="soft">
        <View style={styles.ctaRow}>
          <View style={styles.ctaCopy}>
            <AppText variant="subtitle">Shared costs</AppText>
            <AppText>Track what the group paid and keep every split visible.</AppText>
          </View>
          <Button
            label="Add expense"
            fullWidth={false}
            onPress={onAddExpense}
            leftIcon={<Plus color={colors.primaryText} size={18} />}
          />
        </View>
      </Card>

      {grouped.length === 0 ? (
        <EmptyState title="No expenses yet" description="Add shared costs as the trip takes shape." />
      ) : (
        grouped.map((group) => (
          <View key={group.date} style={styles.group}>
            <AppText variant="eyebrow">{formatExpenseDate(group.date)}</AppText>
            <View style={styles.list}>
              {group.items.map((expense) => (
                <ExpenseRow key={expense.id} tripId={tripId} expense={expense} />
              ))}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[5],
  },
  ctaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    justifyContent: 'space-between',
  },
  ctaCopy: {
    flex: 1,
    gap: spacing[1],
    minWidth: 220,
  },
  group: {
    gap: spacing[3],
  },
  list: {
    gap: spacing[3],
  },
});
