import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Link2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { CalendarDateTimeField } from '../../components/ui/CalendarDateField';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Screen } from '../../components/ui/Screen';
import { StateBanner } from '../../components/ui/StateBanner';
import { TextField } from '../../components/ui/TextField';
import { AppText } from '../../components/ui/AppText';
import { colors } from '../../design/theme';
import { spacing } from '../../design/spacing';
import {
  useCreateTripInviteMutation,
  useRevokeTripInviteMutation,
  useTripInvitesQuery,
} from '../../hooks/useInvites';
import { useTripMembersQuery, useTripQuery } from '../../hooks/useTrips';
import { confirmAction } from '../../lib/ui/confirmAction';
import { CreateInviteFormValues, createInviteSchema } from '../../lib/validation/trip';
import { TripInvite } from '../../types/trip';
import { useAuth } from '../auth/AuthProvider';
import { canManageTrip } from './adminUtils';
import { InviteRow } from './InviteRow';

type InvitesScreenProps = {
  tripId: string;
};

export function InvitesScreen({ tripId }: InvitesScreenProps) {
  const { user } = useAuth();
  const tripQuery = useTripQuery(tripId);
  const membersQuery = useTripMembersQuery(tripId);
  const invitesQuery = useTripInvitesQuery(tripId);
  const createInviteMutation = useCreateTripInviteMutation();
  const revokeInviteMutation = useRevokeTripInviteMutation(tripId);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateInviteFormValues>({
    resolver: zodResolver(createInviteSchema),
    defaultValues: {
      tripId,
      expiresAt: null,
      maxUses: 10,
    },
  });

  const createInvite = handleSubmit(async (values) => {
    const created = await createInviteMutation.mutateAsync({ ...values, tripId });
    setCreatedUrl(created.url);
    setCopied(false);
  });

  const copyCreatedUrl = async () => {
    if (!createdUrl) {
      return;
    }

    await copyText(createdUrl);
    setCopied(true);
  };

  const regenerateInvite = async (invite: TripInvite) => {
    if (!invite.revokedAt) {
      await revokeInviteMutation.mutateAsync(invite.id);
    }

    const created = await createInviteMutation.mutateAsync({
      tripId,
      expiresAt: invite.expiresAt,
      maxUses: invite.maxUses,
    });
    setCreatedUrl(created.url);
    setCopied(false);
  };

  const canManage = canManageTrip(user?.id, membersQuery.data ?? []);
  const isReadOnly = Boolean(tripQuery.data?.closedAt);

  if (invitesQuery.isLoading || tripQuery.isLoading || membersQuery.isLoading) {
    return <LoadingState label="Loading invites..." />;
  }

  if (tripQuery.isError) {
    return <ErrorState title="Trip failed to load" message={tripQuery.error.message} />;
  }

  if (membersQuery.isError) {
    return <ErrorState title="Members failed to load" message={membersQuery.error.message} />;
  }

  if (!canManage) {
    return (
      <Screen centered>
        <StateBanner
          title="Permission denied"
          message="Only the owner or an admin can create, revoke, or regenerate invite links."
          tone="locked"
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <PageHeader
        eyebrow="Invite"
        title="Share the trip"
        description="Invite links can expire by time, number of uses, or both."
      />

      {createInviteMutation.isError ? (
        <ErrorState title="Invite creation failed" message={createInviteMutation.error.message} />
      ) : null}
      {revokeInviteMutation.isError ? (
        <ErrorState title="Invite revocation failed" message={revokeInviteMutation.error.message} />
      ) : null}
      {invitesQuery.error ? <ErrorState title="Invites failed to load" message={invitesQuery.error.message} /> : null}
      {isReadOnly ? (
        <StateBanner
          title="Trip is read-only"
          message="Reopen the trip before changing invite links."
          tone="locked"
        />
      ) : null}

      <Card variant="elevated">
        <View style={styles.formHeader}>
          <Link2 color={colors.primary} size={22} />
          <View style={styles.formCopy}>
            <AppText variant="subtitle">Create invite link</AppText>
            <AppText>Set one or both limits. The raw link is shown only after creation.</AppText>
          </View>
        </View>
        <Controller
          control={control}
          name="expiresAt"
          render={({ field }) => (
            <CalendarDateTimeField
              label="Expires at"
              value={field.value}
              onChange={field.onChange}
              error={errors.expiresAt?.message}
              disabled={isReadOnly}
            />
          )}
        />
        <Controller
          control={control}
          name="maxUses"
          render={({ field }) => (
            <TextField
              label="Max uses"
              keyboardType="number-pad"
              onBlur={field.onBlur}
              onChangeText={(text) => field.onChange(text.trim().length > 0 ? Number(text) : null)}
              value={field.value === null ? '' : String(field.value)}
              error={errors.maxUses?.message}
              editable={!isReadOnly}
            />
          )}
        />
        <Button
          label="Create invite"
          loading={createInviteMutation.isPending}
          disabled={isReadOnly || createInviteMutation.isPending}
          onPress={createInvite}
        />
      </Card>

      {createdUrl ? (
        <Card variant="soft">
          <AppText variant="subtitle">New invite link</AppText>
          <AppText selectable>{createdUrl}</AppText>
          <Button
            label={copied ? 'Copied' : 'Copy link'}
            variant="secondary"
            onPress={() => void copyCreatedUrl()}
            leftIcon={<Copy color={colors.primary} size={18} />}
          />
        </Card>
      ) : null}

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Existing invites</AppText>
        <AppText variant="caption">Use regenerate when you want a fresh token.</AppText>
      </View>

      {(invitesQuery.data ?? []).length === 0 ? (
        <EmptyState title="No active links" description="Create an invite link when you are ready to share access." />
      ) : (
        <View style={styles.list}>
          {(invitesQuery.data ?? []).map((invite) => (
            <InviteRow
              key={invite.id}
              invite={invite}
              isBusy={isReadOnly || createInviteMutation.isPending || revokeInviteMutation.isPending}
              onRegenerate={() =>
                confirmAction({
                  title: 'Regenerate invite?',
                  message: 'This creates a new link. If the old link is active, it will be revoked first.',
                  confirmLabel: 'Regenerate',
                  onConfirm: () => void regenerateInvite(invite),
                })
              }
              onRevoke={() =>
                confirmAction({
                  title: 'Revoke invite?',
                  message: 'This link will stop working immediately. Members who already joined keep access.',
                  confirmLabel: 'Revoke',
                  destructive: true,
                  onConfirm: () => revokeInviteMutation.mutate(invite.id),
                })
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

async function copyText(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  }
}

const styles = StyleSheet.create({
  formHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
  },
  formCopy: {
    flex: 1,
    gap: spacing[1],
  },
  sectionHeader: {
    gap: spacing[1],
  },
  list: {
    gap: spacing[3],
  },
});
