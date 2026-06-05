import { Link } from 'expo-router';
import { CalendarDays, MapPinned, Plus, UsersRound } from 'lucide-react-native';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../src/components/feedback/InlineNotice';
import { AppText } from '../../src/components/ui/AppText';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Chip } from '../../src/components/ui/Chip';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { Screen } from '../../src/components/ui/Screen';
import { colors } from '../../src/design/theme';
import { radius, spacing } from '../../src/design/spacing';
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
      <Screen centered>
        <InlineNotice title="Supabase is not configured" message={authError ?? undefined} tone="error" />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen centered>
        <EmptyState
          title="Log in to see trips"
          description="Your trips are private to your account."
        />
        <Link href="/login" asChild>
          <Button label="Log in" />
        </Link>
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

  const trips = tripsQuery.data ?? [];

  return (
    <Screen>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerCopy}>
                <AppText variant="eyebrow">Trips</AppText>
                <AppText variant="display">Your trips</AppText>
                <AppText variant="body">Pick up where the group left off.</AppText>
              </View>
              <Link href="/trips/create" asChild>
                <Button
                  label="New trip"
                  leftIcon={<Plus color={colors.primaryText} size={18} strokeWidth={2.3} />}
                  fullWidth={false}
                />
              </Link>
            </View>

            <View style={styles.summaryRow}>
              <SummaryTile label="Active" value={String(trips.filter((trip) => trip.status !== 'closed').length)} />
              <SummaryTile label="Confirmed" value={String(trips.filter((trip) => trip.confirmedAt).length)} />
              <SummaryTile label="Closed" value={String(trips.filter((trip) => trip.status === 'closed').length)} />
            </View>

            {tripsQuery.error ? (
              <InlineNotice title="Trips failed to load" message={tripsQuery.error.message} tone="error" />
            ) : null}
          </View>
        }
        contentContainerStyle={styles.list}
        data={trips}
        keyExtractor={(trip) => trip.id}
        ListEmptyComponent={
          <Card variant="soft" padding="lg">
            <EmptyState
              title="No trips yet"
              description="Create a trip, invite the group, and make the first decision together."
            />
            <Link href="/trips/create" asChild>
              <Button label="Create your first trip" />
            </Link>
          </Card>
        }
        renderItem={({ item }) => <TripListItem trip={item} />}
      />
    </Screen>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryTile}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="subtitle">{value}</AppText>
    </View>
  );
}

function TripListItem({ trip }: { trip: Trip }) {
  const status = getVisibleStatus(trip);
  const dates = formatDates(trip);

  return (
    <Link href={`/trips/${trip.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${trip.title}. Status: ${status}`}
        style={({ pressed }) => [styles.tripPressable, pressed && styles.pressed]}
      >
        <Card variant="elevated" padding="lg" style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <View style={styles.tripIcon}>
              <MapPinned color={colors.primary} size={22} strokeWidth={2.2} />
            </View>
            <View style={styles.tripTitleWrap}>
              <AppText variant="subtitle" numberOfLines={1}>
                {trip.title}
              </AppText>
              {trip.description ? (
                <AppText variant="caption" numberOfLines={2}>
                  {trip.description}
                </AppText>
              ) : null}
            </View>
            <Chip label={status} tone={trip.confirmedAt ? 'sea' : 'sun'} />
          </View>

          <View style={styles.tripMeta}>
            <View style={styles.metaItem}>
              <CalendarDays color={colors.textMuted} size={16} strokeWidth={2.2} />
              <AppText variant="caption">{dates}</AppText>
            </View>
            <View style={styles.metaItem}>
              <UsersRound color={colors.textMuted} size={16} strokeWidth={2.2} />
              <AppText variant="caption">{trip.timezone}</AppText>
            </View>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}

function getVisibleStatus(trip: Trip) {
  if (trip.status === 'closed') {
    return 'Closed';
  }

  if (trip.confirmedAt) {
    return 'Confirmed';
  }

  if (trip.startsOn && trip.endsOn) {
    return 'Planned';
  }

  return 'Planning';
}

function formatDates(trip: Trip) {
  if (!trip.startsOn || !trip.endsOn) {
    return 'Dates not decided';
  }

  return `${formatDate(trip.startsOn)} - ${formatDate(trip.endsOn)}`;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

const styles = StyleSheet.create({
  header: {
    gap: spacing[5],
    paddingBottom: spacing[2],
    paddingTop: spacing[2],
  },
  headerTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    gap: spacing[1],
    minWidth: 240,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  summaryTile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: spacing[1],
    minWidth: 0,
    padding: spacing[3],
  },
  list: {
    gap: spacing[4],
    paddingBottom: spacing[8],
    paddingTop: spacing[5],
  },
  tripPressable: {
    borderRadius: radius.lg,
  },
  tripCard: {
    gap: spacing[4],
  },
  pressed: {
    opacity: 0.84,
  },
  tripHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[3],
  },
  tripIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSea,
    borderRadius: radius.lg,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  tripTitleWrap: {
    flex: 1,
    gap: spacing[1],
    minWidth: 0,
  },
  tripMeta: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    paddingTop: spacing[3],
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
});
