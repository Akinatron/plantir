import { router, useLocalSearchParams } from 'expo-router';

import { Screen } from '../../../../src/components/ui/Screen';
import { PageHeader } from '../../../../src/components/ui/PageHeader';
import { CreateExpenseSheet } from '../../../../src/features/money/CreateExpenseSheet';

export default function CreateExpenseRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  return (
    <Screen scroll>
      <PageHeader
        eyebrow="Expense"
        title="Add shared cost"
        description="Split equally by default and exclude anyone who should not pay."
      />
      <CreateExpenseSheet
        tripId={tripId}
        inline
        onCreated={(expenseId) => router.replace(`/trips/${tripId}/expenses/${expenseId}`)}
      />
    </Screen>
  );
}
