import { useLocalSearchParams } from 'expo-router';

import { SettingsScreen } from '../../../src/features/trip-admin/SettingsScreen';

export default function TripSettingsRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  return <SettingsScreen tripId={tripId} />;
}
