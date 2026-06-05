import { Slot, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LoadingState } from '../../components/ui/LoadingState';
import { colors } from '../../design/theme';
import { useTripQuery } from '../../hooks/useTrips';
import { TripHeader } from './TripHeader';
import { TripTabBar } from './TripTabBar';

export function TripShell() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const tripQuery = useTripQuery(tripId);

  if (!tripId) {
    return (
      <View style={styles.screen}>
        <LoadingState label="Loading trip..." />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TripHeader tripId={tripId} trip={tripQuery.data} isLoading={tripQuery.isLoading} />
      <TripTabBar tripId={tripId} />
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
