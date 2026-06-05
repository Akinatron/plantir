import { useLocalSearchParams } from 'expo-router';

import { PlacesScreen } from '../../../../src/features/places/PlacesScreen';

export default function DestinationRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  return <PlacesScreen tripId={tripId} />;
}
