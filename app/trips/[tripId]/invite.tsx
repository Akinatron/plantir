import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FlatList, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../src/components/feedback/LoadingState';
import { PlaceholderState } from '../../../src/components/feedback/PlaceholderState';
import { AppText } from '../../../src/components/ui/AppText';
import { Button } from '../../../src/components/ui/Button';
import { CalendarDateTimeField } from '../../../src/components/ui/CalendarDateField';
import { Card } from '../../../src/components/ui/Card';
import { PageHeader } from '../../../src/components/ui/PageHeader';
import { Screen } from '../../../src/components/ui/Screen';
import { TextField } from '../../../src/components/ui/TextField';
import {
  useCreateTripInviteMutation,
  useRevokeTripInviteMutation,
  useTripInvitesQuery,
} from '../../../src/hooks/useInvites';
import { confirmAction } from '../../../src/lib/ui/confirmAction';
import { CreateInviteFormValues, createInviteSchema } from '../../../src/lib/validation/trip';
import { TripInvite } from '../../../src/types/trip';

export default function InviteScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const invitesQuery = useTripInvitesQuery(tripId);
  const createInviteMutation = useCreateTripInviteMutation();
  const revokeInviteMutation = useRevokeTripInviteMutation(tripId);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
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

  const onSubmit = handleSubmit(async (values) => {
    const created = await createInviteMutation.mutateAsync({ ...values, tripId });
    setCreatedUrl(created.url);
  });

  if (invitesQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading invites..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        ListHeaderComponent={
          <View style={styles.content}>
            <PageHeader
              eyebrow="Invite"
              title="Share the trip"
              description="Invite links can expire by time, number of uses, or both."
            />

            {createInviteMutation.error ? (
              <InlineNotice
                title="Invite creation failed"
                message={createInviteMutation.error.message}
                tone="error"
              />
            ) : null}

            {revokeInviteMutation.error ? (
              <InlineNotice
                title="Invite revocation failed"
                message={revokeInviteMutation.error.message}
                tone="error"
              />
            ) : null}

            {createdUrl ? (
              <InlineNotice title="Invite created" message={createdUrl} tone="success" />
            ) : null}

            <View style={styles.form}>
              <Controller
                control={control}
                name="expiresAt"
                render={({ field: { onChange, value } }) => (
                  <CalendarDateTimeField
                    label="Expires at"
                    value={value ?? ''}
                    onChange={onChange}
                    error={errors.expiresAt?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="maxUses"
                render={({ field: { onBlur, onChange, value } }) => (
                  <TextField
                    label="Max uses"
                    keyboardType="number-pad"
                    onBlur={onBlur}
                    onChangeText={(text) => onChange(text.trim().length > 0 ? Number(text) : null)}
                    value={value === null ? '' : String(value)}
                    error={errors.maxUses?.message}
                  />
                )}
              />
              <Button
                label={createInviteMutation.isPending ? 'Creating...' : 'Create invite'}
                onPress={onSubmit}
                disabled={createInviteMutation.isPending}
              />
            </View>

            <AppText variant="subtitle">Existing invites</AppText>
          </View>
        }
        contentContainerStyle={styles.list}
        data={invitesQuery.data ?? []}
        keyExtractor={(invite) => invite.id}
        ListEmptyComponent={
          <PlaceholderState title="No active links" description="Create an invite link when you are ready to share access." />
        }
        renderItem={({ item }) => (
          <InviteRow
            invite={item}
            onRevoke={() =>
              confirmAction({
                title: 'Revoke invite?',
                message: 'This link will stop working immediately. Members who already joined will keep access.',
                confirmLabel: 'Revoke',
                destructive: true,
                onConfirm: () => revokeInviteMutation.mutate(item.id),
              })
            }
            isRevoking={revokeInviteMutation.isPending}
          />
        )}
      />
    </Screen>
  );
}

function InviteRow({
  invite,
  onRevoke,
  isRevoking,
}: {
  invite: TripInvite;
  onRevoke: () => void;
  isRevoking: boolean;
}) {
  return (
    <Card>
      <AppText variant="subtitle">{invite.revokedAt ? 'Revoked invite' : 'Active invite'}</AppText>
      <AppText>Uses: {invite.useCount}{invite.maxUses === null ? '' : ` / ${invite.maxUses}`}</AppText>
      <AppText>Expires: {invite.expiresAt ?? 'No time limit'}</AppText>
      {!invite.revokedAt ? (
        <Button label="Revoke" variant="danger" onPress={onRevoke} disabled={isRevoking} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    paddingTop: 24,
  },
  form: {
    gap: 14,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
});
