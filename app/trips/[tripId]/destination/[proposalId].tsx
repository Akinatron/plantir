import { useLocalSearchParams } from 'expo-router';

import { PlaceDetail } from '../../../../src/features/places/PlaceDetail';

export default function DestinationProposalRoute() {
  const { tripId, proposalId } = useLocalSearchParams<{ tripId: string; proposalId: string }>();

  return <PlaceDetail tripId={tripId} proposalId={proposalId} />;
}
