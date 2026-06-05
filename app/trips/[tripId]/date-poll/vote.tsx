import { useLocalSearchParams } from 'expo-router';

import { InlineNotice } from '../../../../src/components/feedback/InlineNotice';
import { Screen } from '../../../../src/components/ui/Screen';
import { DatesScreen } from '../../../../src/features/dates/DatesScreen';

export default function DatePollVoteScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  if (!tripId) {
    return (
      <Screen>
        <InlineNotice title="Date poll unavailable" message="Missing trip id." tone="error" />
      </Screen>
    );
  }

  return <DatesScreen tripId={tripId} />;
}
