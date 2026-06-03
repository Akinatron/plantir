import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../src/components/feedback/LoadingState';
import { AppText } from '../../src/components/ui/AppText';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { useAcceptTripInviteMutation } from '../../src/hooks/useInvites';

export default function PublicInviteScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { user, isLoading } = useAuth();
  const acceptMutation = useAcceptTripInviteMutation();
  const next = `/invite/${token}`;

  useEffect(() => {
    if (!isLoading && user && token && !acceptMutation.isPending && !acceptMutation.data) {
      acceptMutation.mutate(token);
    }
  }, [acceptMutation, isLoading, token, user]);

  useEffect(() => {
    if (
      acceptMutation.data &&
      (acceptMutation.data.status === 'joined' || acceptMutation.data.status === 'already_member') &&
      acceptMutation.data.tripId
    ) {
      router.replace(`/trips/${acceptMutation.data.tripId}`);
    }
  }, [acceptMutation.data, router]);

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Checking session..." />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen>
        <View style={styles.content}>
          <View style={styles.header}>
            <AppText variant="eyebrow">Invitation</AppText>
            <AppText variant="title">You were invited to a trip</AppText>
            <AppText>Log in or create an account to accept this invitation.</AppText>
          </View>
          <View style={styles.actions}>
            <Link href={{ pathname: '/login', params: { next } }} asChild>
              <Button label="Log in and join" />
            </Link>
            <Link href={{ pathname: '/signup', params: { next } }} asChild>
              <Button label="Create account" variant="secondary" />
            </Link>
          </View>
        </View>
      </Screen>
    );
  }

  if (acceptMutation.isPending) {
    return (
      <Screen>
        <LoadingState label="Accepting invitation..." />
      </Screen>
    );
  }

  const status = acceptMutation.data?.status;

  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.header}>
          <AppText variant="eyebrow">Invitation</AppText>
          <AppText variant="title">{getInviteTitle(status)}</AppText>
          <AppText>{acceptMutation.data?.message ?? 'Waiting to accept invitation.'}</AppText>
        </View>

        {acceptMutation.error ? (
          <InlineNotice title="Invitation failed" message={acceptMutation.error.message} tone="error" />
        ) : null}

        {status && status !== 'joined' && status !== 'already_member' ? (
          <InlineNotice title={getInviteTitle(status)} message={acceptMutation.data?.message} tone="error" />
        ) : null}

        <Button label="Try again" onPress={() => acceptMutation.mutate(token)} />
      </View>
    </Screen>
  );
}

function getInviteTitle(status: string | undefined): string {
  if (status === 'invalid') {
    return 'Invalid invitation';
  }

  if (status === 'expired') {
    return 'Invitation expired';
  }

  if (status === 'revoked') {
    return 'Invitation revoked';
  }

  if (status === 'max_uses_reached') {
    return 'Invitation is full';
  }

  if (status === 'pending_approval') {
    return 'Pending approval';
  }

  if (status === 'already_member') {
    return 'Already joined';
  }

  if (status === 'joined') {
    return 'Joined';
  }

  return 'Accept invitation';
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: 24,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  header: {
    gap: 10,
  },
  actions: {
    gap: 12,
  },
});
