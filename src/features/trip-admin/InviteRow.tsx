import { StyleSheet, View } from 'react-native';
import { RotateCcw, Trash2 } from 'lucide-react-native';

import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { colors } from '../../design/theme';
import { spacing } from '../../design/spacing';
import { TripInvite } from '../../types/trip';
import { formatInstant } from './adminUtils';

type InviteRowProps = {
  invite: TripInvite;
  isBusy?: boolean;
  onRevoke: () => void;
  onRegenerate: () => void;
};

export function InviteRow({ invite, isBusy = false, onRevoke, onRegenerate }: InviteRowProps) {
  const active = !invite.revokedAt;
  const usesLabel = invite.maxUses === null ? `${invite.useCount} uses` : `${invite.useCount} / ${invite.maxUses} uses`;

  return (
    <Card variant={active ? 'elevated' : 'soft'}>
      <View style={styles.header}>
        <View>
          <AppText variant="subtitle">{active ? 'Active invite' : 'Revoked invite'}</AppText>
          <AppText variant="caption">Created {formatInstant(invite.createdAt)}</AppText>
        </View>
        <Chip label={active ? 'Active' : 'Revoked'} tone={active ? 'sea' : 'coral'} />
      </View>
      <View style={styles.metaGrid}>
        <Meta label="Expiration" value={formatInstant(invite.expiresAt)} />
        <Meta label="Uses" value={usesLabel} />
      </View>
      <View style={styles.actions}>
        {active ? (
          <Button
            label="Revoke"
            variant="danger"
            fullWidth={false}
            disabled={isBusy}
            onPress={onRevoke}
            leftIcon={<Trash2 color={colors.danger} size={18} />}
          />
        ) : null}
        <Button
          label="Regenerate"
          variant="secondary"
          fullWidth={false}
          loading={isBusy}
          disabled={isBusy}
          onPress={onRegenerate}
          leftIcon={<RotateCcw color={colors.primary} size={18} />}
        />
      </View>
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  meta: {
    flexBasis: 180,
    flexGrow: 1,
    gap: spacing[1],
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    justifyContent: 'flex-end',
  },
});
