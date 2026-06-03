import { useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../src/components/feedback/LoadingState';
import { AppText } from '../../../src/components/ui/AppText';
import { Screen } from '../../../src/components/ui/Screen';
import { useTripMembersQuery } from '../../../src/hooks/useTrips';
import { TripMember } from '../../../src/types/trip';

export default function MembersScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const membersQuery = useTripMembersQuery(tripId);

  if (membersQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading members..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="eyebrow">Members</AppText>
        <AppText variant="title">Trip group</AppText>
      </View>

      {membersQuery.error ? (
        <InlineNotice title="Members failed to load" message={membersQuery.error.message} tone="error" />
      ) : null}

      <FlatList
        contentContainerStyle={styles.list}
        data={membersQuery.data ?? []}
        keyExtractor={(member) => member.id}
        renderItem={({ item }) => <MemberRow member={item} />}
      />
    </Screen>
  );
}

function MemberRow({ member }: { member: TripMember }) {
  return (
    <View style={styles.row}>
      <View>
        <AppText variant="subtitle">{member.displayName ?? 'Unnamed member'}</AppText>
        <AppText>{member.userId}</AppText>
      </View>
      <AppText variant="eyebrow">{member.role}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 8,
    paddingVertical: 24,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  row: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAECF0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
  },
});
