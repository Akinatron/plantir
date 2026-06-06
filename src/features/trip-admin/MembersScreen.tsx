import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Link2, UsersRound } from 'lucide-react-native';

import { useAuth } from '../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { colors } from '../../design/theme';
import { spacing } from '../../design/spacing';
import { useTripMembersQuery, useUpdateTripMemberRoleMutation } from '../../hooks/useTrips';
import { TripMemberRole } from '../../types/trip';
import { canManageTrip } from './adminUtils';
import { MemberRow } from './MemberRow';

type MembersScreenProps = {
  tripId: string;
};

export function MembersScreen({ tripId }: MembersScreenProps) {
  const { user } = useAuth();
  const membersQuery = useTripMembersQuery(tripId);
  const updateRoleMutation = useUpdateTripMemberRoleMutation(tripId);
  const members = membersQuery.data ?? [];
  const canManage = canManageTrip(user?.id, members);

  if (membersQuery.isLoading) {
    return <LoadingState label="Loading members..." />;
  }

  return (
    <Screen scroll>
      <PageHeader
        eyebrow="Group"
        title="Trip members"
        description="See who has access and manage roles for this trip."
      >
        <Link href={`/trips/${tripId}/invite`} asChild>
          <Button
            label="Invite"
            fullWidth={false}
            leftIcon={<Link2 color={colors.primaryText} size={18} />}
          />
        </Link>
      </PageHeader>

      {membersQuery.error ? <ErrorState title="Members failed to load" message={membersQuery.error.message} /> : null}
      {updateRoleMutation.isError ? (
        <ErrorState title="Role update failed" message={updateRoleMutation.error.message} />
      ) : null}

      <Card variant="soft">
        <View style={styles.summary}>
          <UsersRound color={colors.primary} size={22} />
          <View>
            <AppText variant="bodyStrong">{members.length} members</AppText>
            <AppText variant="caption">{canManage ? 'You can manage roles.' : 'Only admins can change roles.'}</AppText>
          </View>
        </View>
      </Card>

      {members.length === 0 ? (
        <EmptyState title="No members yet" description="Create or share an invite link to bring people in." />
      ) : (
        <View style={styles.list}>
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              canManageRoles={canManage}
              isUpdating={updateRoleMutation.isPending && updateRoleMutation.variables?.memberId === member.id}
              onChangeRole={(memberId, role) =>
                updateRoleMutation.mutate({ memberId, role: role as Exclude<TripMemberRole, 'owner'> })
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
  },
  list: {
    gap: spacing[3],
  },
});
