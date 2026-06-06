import { useLocalSearchParams } from 'expo-router';

import { MembersScreen } from '../../../src/features/trip-admin/MembersScreen';

export default function MembersRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  return <MembersScreen tripId={tripId} />;
}
