import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { LoadingState } from '../../../../src/components/feedback/LoadingState';
import { AppText } from '../../../../src/components/ui/AppText';
import { Button } from '../../../../src/components/ui/Button';
import { ErrorState } from '../../../../src/components/ui/ErrorState';
import { Screen } from '../../../../src/components/ui/Screen';
import { StateBanner } from '../../../../src/components/ui/StateBanner';
import { useAuth } from '../../../../src/features/auth/AuthProvider';
import { canManageTrip } from '../../../../src/features/trip-admin/adminUtils';
import {
  useCreateDestinationPollMutation,
  useDestinationBundleQuery,
} from '../../../../src/hooks/useDestination';
import { useTripMembersQuery, useTripQuery } from '../../../../src/hooks/useTrips';

export default function DestinationSetupScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useAuth();
  const tripQuery = useTripQuery(tripId);
  const membersQuery = useTripMembersQuery(tripId);
  const bundleQuery = useDestinationBundleQuery(tripId);
  const createMutation = useCreateDestinationPollMutation(user?.id);

  if (tripQuery.isLoading || membersQuery.isLoading || bundleQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading destination setup..." />
      </Screen>
    );
  }

  if (tripQuery.isError) {
    return (
      <Screen centered>
        <ErrorState title="Trip failed to load" message={tripQuery.error.message} />
      </Screen>
    );
  }

  if (membersQuery.isError) {
    return (
      <Screen centered>
        <ErrorState title="Members failed to load" message={membersQuery.error.message} />
      </Screen>
    );
  }

  if (bundleQuery.isError) {
    return (
      <Screen centered>
        <ErrorState title="Destination failed to load" message={bundleQuery.error.message} />
      </Screen>
    );
  }

  const existingPoll = bundleQuery.data?.poll;
  const canManage = canManageTrip(user?.id, membersQuery.data ?? []);
  const isReadOnly = Boolean(tripQuery.data?.closedAt);
  const actionDisabled =
    !canManage || isReadOnly || createMutation.isPending || Boolean(existingPoll && existingPoll.status !== 'closed');

  if (!canManage) {
    return (
      <Screen centered>
        <StateBanner
          title="Permission denied"
          message="Only the owner or an admin can start accommodation voting."
          tone="locked"
        />
      </Screen>
    );
  }

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

        {isReadOnly ? (
          <StateBanner
            title="Trip is read-only"
            message="Destination setup is locked while this trip is closed."
            tone="locked"
          />
        ) : null}

        {existingPoll && existingPoll.status !== 'closed' ? (
          <StateBanner
            title="Destination poll already active"
            message="Use the proposals screen for the current poll."
            tone="info"
          />
        ) : null}

        {createMutation.error ? (
          <StateBanner title="Destination setup failed" message={createMutation.error.message} tone="danger" />
        ) : null}

        <Button
          label={createMutation.isPending ? 'Starting...' : 'Start destination poll'}
          onPress={startPoll}
          disabled={!user || actionDisabled}
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
