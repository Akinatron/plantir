import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { ReceiptText } from 'lucide-react-native';

import { AppText } from '../../components/ui/AppText';
import { Chip } from '../../components/ui/Chip';
import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';
import { formatCents } from '../../lib/algorithms/money';
import { Expense } from '../../types/expense';
import { formatShortDate } from './moneyUtils';

type ExpenseRowProps = {
  tripId: string;
  expense: Expense;
};

export function ExpenseRow({ tripId, expense }: ExpenseRowProps) {
  return (
    <Link href={`/trips/${tripId}/expenses/${expense.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open expense ${expense.title}, ${formatCents(expense.amountCents, expense.currencyCode)}`}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={styles.iconWrap}>
          <ReceiptText color={colors.primary} size={20} />
        </View>
        <View style={styles.copy}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {expense.title}
          </AppText>
          <View style={styles.meta}>
            <AppText variant="caption">{formatShortDate(expense.expenseDate)}</AppText>
            {expense.category ? <Chip label={expense.category} tone="sky" /> : null}
          </View>
        </View>
        <AppText variant="bodyStrong">{formatCents(expense.amountCents, expense.currencyCode)}</AppText>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[3],
    minHeight: 76,
    padding: spacing[3],
  },
  pressed: {
    opacity: 0.82,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSea,
    borderRadius: radius.full,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  copy: {
    flex: 1,
    gap: spacing[1],
    minWidth: 0,
  },
  meta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
});
