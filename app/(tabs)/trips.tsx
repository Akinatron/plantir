import { Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../src/components/feedback/LoadingState';
import { PlaceholderState } from '../../src/components/feedback/PlaceholderState';
import { AppText } from '../../src/components/ui/AppText';
import { Button } from '../../src/components/ui/Button';
import { PageHeader } from '../../src/components/ui/PageHeader';
import { Screen } from '../../src/components/ui/Screen';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { useTripsQuery } from '../../src/hooks/useTrips';
import { Trip } from '../../src/types/trip';

export default function TripsTabScreen() {
  const { user, isLoading: authLoading, isConfigured, error: authError } = useAuth();
  const tripsQuery = useTripsQuery(user?.id);

  if (authLoading) {
    return (
      <Screen>
        <LoadingState label="Loading session..." />
      </Screen>
    );
  }

  if (!isConfigured) {
    return (
      <Screen>
        <InlineNotice title="Supabase is not configured" message={authError ?? undefined} tone="error" />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen>
        <View style={styles.centered}>
          <PlaceholderState title="Log in to see trips" description="Your trips are private to your account." />
          <Link href="/login" asChild>
            <Button label="Log in" />
          </Link>
        </View>
      </Screen>
    );
  }

  if (tripsQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading trips..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <PageHeader eyebrow="Trips" title="Your trips" />
        <Link href="/trips/create" asChild>
          <Button label="New trip" />
        </Link>
      </View>

      {tripsQuery.error ? (
        <InlineNotice title="Trips failed to load" message={tripsQuery.error.message} tone="error" />
      ) : null}

      <FlatList
        contentContainerStyle={styles.list}
        data={tripsQuery.data ?? []}
        keyExtractor={(trip) => trip.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <PlaceholderState
              title="No trips yet"
              description="Create a trip, invite the group, and make the first decision together."
            />
            <Link href="/trips/create" asChild>
              <Button label="Create your first trip" />
            </Link>
          </View>
        }
        renderItem={({ item }) => <TripListItem trip={item} />}
      />
    </Screen>
  );
}

function TripListItem({ trip }: { trip: Trip }) {
  return (
    <Link href={`/trips/${trip.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${trip.title}. Status: ${formatStatus(trip.status)}`}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <AppText variant="subtitle">{trip.title}</AppText>
        <AppText>{formatStatus(trip.status)}</AppText>
      </Pressable>
    </Link>
  );
}

function formatStatus(status: string): string {
  return status.replaceAll('_', ' ');
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    gap: 20,
  },
  header: {
    gap: 16,
    paddingVertical: 24,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  empty: {
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAECF0',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    minHeight: 72,
    padding: 16,
  },
  pressed: {
    opacity: 0.82,
  },
});
