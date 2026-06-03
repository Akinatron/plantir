import { Link, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../src/components/feedback/LoadingState';
import { AppText } from '../../../src/components/ui/AppText';
import { Button } from '../../../src/components/ui/Button';
import { Screen } from '../../../src/components/ui/Screen';
import { useTripMembersQuery, useTripQuery } from '../../../src/hooks/useTrips';
import { getTripNextAction } from '../../../src/services/tripService';

export default function TripDashboardScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const tripQuery = useTripQuery(tripId);
  const membersQuery = useTripMembersQuery(tripId);

  if (tripQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading trip..." />
      </Screen>
    );
  }

  if (!tripQuery.data) {
    return (
      <Screen>
        <InlineNotice
          title="Trip unavailable"
          message={tripQuery.error?.message ?? 'This trip does not exist or you do not have access.'}
          tone="error"
        />
      </Screen>
    );
  }

  const trip = tripQuery.data;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <AppText variant="eyebrow">Trip dashboard</AppText>
          <AppText variant="title">{trip.title}</AppText>
          {trip.description ? <AppText>{trip.description}</AppText> : null}
        </View>

        <View style={styles.panel}>
          <AppText variant="eyebrow">Status</AppText>
          <AppText variant="subtitle">{trip.status.replaceAll('_', ' ')}</AppText>
          <AppText>{getTripNextAction(trip)}</AppText>
        </View>

        <View style={styles.panel}>
          <AppText variant="eyebrow">Members</AppText>
          <AppText variant="subtitle">{membersQuery.data?.length ?? 0} joined</AppText>
          {membersQuery.error ? <AppText>{membersQuery.error.message}</AppText> : null}
        </View>

        <View style={styles.actions}>
          <Link href={`/trips/${trip.id}/invite`} asChild>
            <Button label="Invite friends" />
          </Link>
          <Link href={`/trips/${trip.id}/members`} asChild>
            <Button label="View members" variant="secondary" />
          </Link>
          <Link href={`/trips/${trip.id}/settings`} asChild>
            <Button label="Trip settings" variant="secondary" />
          </Link>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    paddingVertical: 24,
  },
  header: {
    gap: 8,
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAECF0',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  actions: {
    gap: 12,
  },
});
