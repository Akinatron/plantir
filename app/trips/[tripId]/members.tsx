import { useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../src/components/feedback/LoadingState';
import { PlaceholderState } from '../../../src/components/feedback/PlaceholderState';
import { AppText } from '../../../src/components/ui/AppText';
import { Card } from '../../../src/components/ui/Card';
import { PageHeader } from '../../../src/components/ui/PageHeader';
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
        <PageHeader eyebrow="Members" title="Trip group" description="Everyone listed here can see this trip." />
      </View>

      {membersQuery.error ? (
        <InlineNotice title="Members failed to load" message={membersQuery.error.message} tone="error" />
      ) : null}

      <FlatList
        contentContainerStyle={styles.list}
        data={membersQuery.data ?? []}
        keyExtractor={(member) => member.id}
        ListEmptyComponent={
          <PlaceholderState title="No members yet" description="Create or share an invite link to bring people in." />
        }
        renderItem={({ item }) => <MemberRow member={item} />}
      />
    </Screen>
  );
}

function MemberRow({ member }: { member: TripMember }) {
  return (
    <Card
      accessible
      accessibilityLabel={`${member.displayName ?? 'Unnamed member'}, ${member.role}`}
      style={styles.row}
    >
      <View>
        <AppText variant="subtitle">{member.displayName ?? 'Unnamed member'}</AppText>
        <AppText>{member.role === 'owner' ? 'Owns this trip' : member.role === 'admin' ? 'Can manage trip settings' : 'Can plan and vote'}</AppText>
      </View>
      <AppText variant="eyebrow">{member.role}</AppText>
    </Card>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
});
