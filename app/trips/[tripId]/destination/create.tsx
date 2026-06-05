import { useLocalSearchParams } from 'expo-router';

import { SuggestPlaceForm } from '../../../../src/features/places/SuggestPlaceForm';

export default function CreateDestinationProposalRoute() {
  const { tripId, pollId } = useLocalSearchParams<{ tripId: string; pollId?: string }>();

  return <SuggestPlaceForm tripId={tripId} pollId={pollId ?? null} />;
}
