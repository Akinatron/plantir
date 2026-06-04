import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../../src/components/feedback/LoadingState';
import { AppText } from '../../../../src/components/ui/AppText';
import { Button } from '../../../../src/components/ui/Button';
import { Screen } from '../../../../src/components/ui/Screen';
import { useAuth } from '../../../../src/features/auth/AuthProvider';
import {
  useCreateDestinationPollMutation,
  useDestinationBundleQuery,
} from '../../../../src/hooks/useDestination';

export default function DestinationSetupScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useAuth();
  const bundleQuery = useDestinationBundleQuery(tripId);
  const createMutation = useCreateDestinationPollMutation(user?.id);

  if (bundleQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading destination setup..." />
      </Screen>
    );
  }

  const existingPoll = bundleQuery.data?.poll;

  const startPoll = async () => {
    const poll = await createMutation.mutateAsync({ tripId });
    router.replace(`/trips/${tripId}/destination?pollId=${poll.id}`);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <AppText variant="eyebrow">Destination</AppText>
          <AppText variant="title">Start accommodation voting</AppText>
          <AppText>
            MVP voting is single-choice: each member votes for one proposal and the most votes wins.
          </AppText>
        </View>

        {existingPoll && existingPoll.status !== 'closed' ? (
          <InlineNotice
            title="Destination poll already active"
            message="Use the proposals screen for the current poll."
            tone="success"
          />
        ) : null}

        {createMutation.error ? (
          <InlineNotice title="Destination setup failed" message={createMutation.error.message} tone="error" />
        ) : null}

        <Button
          label={createMutation.isPending ? 'Starting...' : 'Start destination poll'}
          onPress={startPoll}
          disabled={!user || createMutation.isPending || Boolean(existingPoll && existingPoll.status !== 'closed')}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 22,
    paddingVertical: 24,
  },
  header: {
    gap: 8,
  },
});
