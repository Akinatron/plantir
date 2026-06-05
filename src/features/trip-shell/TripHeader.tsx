import { Link } from 'expo-router';
import { ArrowLeft, Settings } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/ui/AppText';
import { Chip } from '../../components/ui/Chip';
import { IconButton } from '../../components/ui/IconButton';
import { colors } from '../../design/theme';
import { layout, spacing } from '../../design/spacing';
import { Trip } from '../../types/trip';

type TripHeaderProps = {
  tripId: string;
  trip?: Trip | null;
  isLoading?: boolean;
};

export function TripHeader({ tripId, trip, isLoading = false }: TripHeaderProps) {
  const title = trip?.title ?? (isLoading ? 'Loading trip...' : 'Trip');
  const visibleStatus = getVisibleStatus(trip);

  return (
    <View style={styles.shell}>
      <View style={styles.container}>
        <Link href="/trips" asChild>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to trips" style={styles.backButton}>
            <ArrowLeft color={colors.text} size={20} strokeWidth={2.2} />
          </Pressable>
        </Link>

        <View style={styles.copy}>
          <AppText variant="title" numberOfLines={1} style={styles.title}>
            {title}
          </AppText>
          <View style={styles.metaRow}>
            {visibleStatus ? <Chip label={visibleStatus} tone={trip?.confirmedAt ? 'sea' : 'sun'} /> : null}
            {trip?.timezone ? <AppText variant="caption">{trip.timezone}</AppText> : null}
          </View>
        </View>

        <Link href={`/trips/${tripId}/settings`} asChild>
          <IconButton
            label="Trip settings"
            icon={<Settings color={colors.primary} size={20} strokeWidth={2.2} />}
            variant="secondary"
          />
        </Link>
      </View>
    </View>
  );
}

function getVisibleStatus(trip?: Trip | null) {
  if (!trip) {
    return null;
  }

  if (trip.status === 'closed') {
    return 'Closed';
  }

  if (trip.confirmedAt) {
    return 'Trip confirmed';
  }

  if (trip.startsOn && trip.endsOn) {
    return 'Trip planned';
  }

  return 'Planning trip';
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.background,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  container: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    maxWidth: layout.maxContentWidth,
    paddingBottom: spacing[3],
    width: '100%',
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  copy: {
    flex: 1,
    gap: spacing[1],
    minWidth: 0,
  },
  title: {
    flexShrink: 1,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
});
