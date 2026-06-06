import { StyleSheet, View } from 'react-native';
import { ShieldCheck, UserCog } from 'lucide-react-native';

import { AppText } from '../../components/ui/AppText';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { colors } from '../../design/theme';
import { spacing } from '../../design/spacing';
import { TripMember, TripMemberRole } from '../../types/trip';
import { roleDescription } from './adminUtils';

type MemberRowProps = {
  member: TripMember;
  canManageRoles: boolean;
  isUpdating?: boolean;
  onChangeRole?: (memberId: string, role: Exclude<TripMemberRole, 'owner'>) => void;
};

export function MemberRow({ member, canManageRoles, isUpdating = false, onChangeRole }: MemberRowProps) {
  const isOwner = member.role === 'owner';
  const nextRole = member.role === 'admin' ? 'member' : 'admin';

  return (
    <Card accessible accessibilityLabel={`${member.displayName ?? 'Unnamed member'}, ${member.role}`}>
      <View style={styles.row}>
        <Avatar uri={member.avatarUrl} name={member.displayName} />
        <View style={styles.copy}>
          <AppText variant="subtitle">{member.displayName ?? 'Unnamed member'}</AppText>
          <AppText>{roleDescription(member.role)}</AppText>
          <View style={styles.joinedRow}>
            <Chip label={member.role} tone={member.role === 'member' ? 'neutral' : 'sea'} />
            {isOwner ? <ShieldCheck color={colors.primary} size={16} /> : <UserCog color={colors.textMuted} size={16} />}
          </View>
        </View>
        {canManageRoles && !isOwner ? (
          <Button
            label={member.role === 'admin' ? 'Make member' : 'Make admin'}
            variant="secondary"
            fullWidth={false}
            loading={isUpdating}
            disabled={isUpdating}
            onPress={() => onChangeRole?.(member.id, nextRole)}
          />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  copy: {
    flex: 1,
    gap: spacing[1],
    minWidth: 180,
  },
  joinedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[1],
  },
});
