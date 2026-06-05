import { useLocalSearchParams } from 'expo-router';

import { MoneyScreen } from '../../../../src/features/money/MoneyScreen';

export default function BalancesRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  return <MoneyScreen tripId={tripId} initialTab="balances" />;
}
