import { useLocalSearchParams } from 'expo-router';

import { InlineNotice } from '../../../src/components/feedback/InlineNotice';
import { Screen } from '../../../src/components/ui/Screen';
import { TripDashboard } from '../../../src/features/trips/TripDashboard';

export default function TripDashboardScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  if (!tripId) {
    return (
      <Screen>
        <InlineNotice title="Trip unavailable" message="Missing trip id." tone="error" />
      </Screen>
    );
  }

  return <TripDashboard tripId={tripId} />;
}
