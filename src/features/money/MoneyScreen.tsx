import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import {
  useComputeTripBalancesMutation,
  useExpensesQuery,
  useMarkSettlementPaidMutation,
  useSettlementPaymentsQuery,
  useSettlementSuggestionsQuery,
  useTripBalancesQuery,
} from '../../hooks/useExpenses';
import { useTripMembersQuery, useTripQuery } from '../../hooks/useTrips';
import { PageHeader } from '../../components/ui/PageHeader';
import { Screen } from '../../components/ui/Screen';
import { SegmentedTabs } from '../../components/ui/SegmentedTabs';
import { CreateExpenseSheet } from './CreateExpenseSheet';
import { ExpensesTab } from './ExpensesTab';
import { BalancesTab } from './BalancesTab';
import { SettlementsTab } from './SettlementsTab';
import { canManageTrip } from '../trip-admin/adminUtils';

type MoneyTab = 'expenses' | 'balances' | 'settlements';

type MoneyScreenProps = {
  tripId: string;
  initialTab?: MoneyTab;
};

export function MoneyScreen({ tripId, initialTab = 'expenses' }: MoneyScreenProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<MoneyTab>(initialTab);
  const [createExpenseVisible, setCreateExpenseVisible] = useState(false);
  const tripQuery = useTripQuery(tripId);
  const membersQuery = useTripMembersQuery(tripId);
  const expensesQuery = useExpensesQuery(tripId);
  const balancesQuery = useTripBalancesQuery(tripId);
  const suggestionsQuery = useSettlementSuggestionsQuery(tripId);
  const paymentsQuery = useSettlementPaymentsQuery(tripId);
  const computeBalancesMutation = useComputeTripBalancesMutation(tripId);
  const markPaidMutation = useMarkSettlementPaidMutation(tripId);
  const expenses = expensesQuery.data ?? [];
  const balances = computeBalancesMutation.data ?? balancesQuery.data;
  const suggestions = computeBalancesMutation.data?.settlements ?? suggestionsQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const sharedLoadError = tripQuery.error ?? membersQuery.error;
  const canManage = canManageTrip(user?.id, members);
  const readOnly = Boolean(tripQuery.data?.closedAt);
  const canAddExpense = Boolean(tripQuery.data && (tripQuery.data.memberCanCreateExpenses || canManage));
  const tabs = useMemo(
    () => [
      { value: 'expenses' as const, label: 'Expenses', badge: expenses.length },
      { value: 'balances' as const, label: 'Balances', badge: balances?.balances.length ?? 0 },
      { value: 'settlements' as const, label: 'Settlements', badge: suggestions.length },
    ],
    [balances?.balances.length, expenses.length, suggestions.length],
  );

  return (
    <Screen scroll>
      <PageHeader
        eyebrow="Money"
        title="Group money"
        description="Track shared costs, see who owes what, and settle with optimized payments."
      />

      <View style={styles.tabsWrap}>
        <SegmentedTabs tabs={tabs} value={activeTab} onChange={setActiveTab} accessibilityLabel="Money sections" />
      </View>

      {activeTab === 'expenses' ? (
        <ExpensesTab
          tripId={tripId}
          expenses={expenses}
          isLoading={expensesQuery.isLoading || tripQuery.isLoading || membersQuery.isLoading}
          error={expensesQuery.error ?? sharedLoadError}
          canAddExpense={canAddExpense}
          readOnly={readOnly}
          onAddExpense={() => setCreateExpenseVisible(true)}
        />
      ) : null}

      {activeTab === 'balances' ? (
        <BalancesTab
          currentUserId={user?.id}
          balances={balances}
          members={members}
          isLoading={balancesQuery.isLoading || membersQuery.isLoading}
          refreshing={computeBalancesMutation.isPending}
          error={balancesQuery.error ?? computeBalancesMutation.error ?? sharedLoadError}
          onRefresh={() => computeBalancesMutation.mutate()}
        />
      ) : null}

      {activeTab === 'settlements' ? (
        <SettlementsTab
          trip={tripQuery.data}
          currentUserId={user?.id}
          members={members}
          suggestions={suggestions}
          payments={payments}
          isLoading={suggestionsQuery.isLoading || paymentsQuery.isLoading || membersQuery.isLoading || tripQuery.isLoading}
          refreshing={computeBalancesMutation.isPending}
          markingPaid={markPaidMutation.isPending}
          error={suggestionsQuery.error ?? paymentsQuery.error ?? computeBalancesMutation.error ?? sharedLoadError}
          markPaidError={markPaidMutation.error}
          onRefresh={() => computeBalancesMutation.mutate()}
          onMarkPaid={(suggestionId) => markPaidMutation.mutate({ suggestionId })}
        />
      ) : null}

      <CreateExpenseSheet
        tripId={tripId}
        visible={createExpenseVisible}
        onClose={() => setCreateExpenseVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabsWrap: {
    width: '100%',
  },
});
