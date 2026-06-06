import { useLocalSearchParams } from 'expo-router';

import { InvitesScreen } from '../../../src/features/trip-admin/InvitesScreen';

export default function InviteRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  return <InvitesScreen tripId={tripId} />;
}
