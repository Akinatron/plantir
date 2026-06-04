import { Link, useLocalSearchParams } from 'expo-router';
import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../src/components/feedback/LoadingState';
import { TripProgressStepper } from '../../../src/components/trips/TripProgressStepper';
import { AppText } from '../../../src/components/ui/AppText';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { PageHeader } from '../../../src/components/ui/PageHeader';
import { Screen } from '../../../src/components/ui/Screen';
import { useAuth } from '../../../src/features/auth/AuthProvider';
import { usePlanningSummaryQuery } from '../../../src/hooks/usePlanning';
import { useTripMembersQuery, useTripQuery } from '../../../src/hooks/useTrips';
import { getTripNextAction } from '../../../src/services/tripService';
import { Trip } from '../../../src/types/trip';

export default function TripDashboardScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useAuth();
  const tripQuery = useTripQuery(tripId);
  const membersQuery = useTripMembersQuery(tripId);
  const planningSummaryQuery = usePlanningSummaryQuery(tripId, user?.id);

  if (tripQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading trip..." />
      </Screen>
    );
  }

  if (!tripQuery.data) {
    return (
      <Screen>
        <InlineNotice
          title="Trip unavailable"
          message={tripQuery.error?.message ?? 'This trip does not exist or you do not have access.'}
          tone="error"
        />
      </Screen>
    );
  }

  const trip = tripQuery.data;
  const primaryAction = getPrimaryAction(trip);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader eyebrow="Trip dashboard" title={trip.title} description={trip.description ?? undefined} />

        <TripProgressStepper status={trip.status} />

        <Card>
          <AppText variant="eyebrow">Status</AppText>
          <AppText variant="subtitle">{trip.status.replaceAll('_', ' ')}</AppText>
          <AppText>{getTripNextAction(trip)}</AppText>
          <Link href={primaryAction.href} asChild>
            <Button label={primaryAction.label} disabled={primaryAction.disabled} />
          </Link>
        </Card>

        <Card>
          <AppText variant="eyebrow">Members</AppText>
          <AppText variant="subtitle">{membersQuery.data?.length ?? 0} joined</AppText>
          {membersQuery.error ? <AppText>{membersQuery.error.message}</AppText> : null}
        </Card>

        <Card>
          <AppText variant="eyebrow">Planning</AppText>
          <AppText variant="subtitle">{planningSummaryQuery.data?.pendingTasks ?? 0} pending tasks</AppText>
          <AppText>{planningSummaryQuery.data?.assignedToMe ?? 0} assigned to me</AppText>
          <AppText>{planningSummaryQuery.data?.missingItems ?? 0} missing packing items</AppText>
          {planningSummaryQuery.error ? <AppText>{planningSummaryQuery.error.message}</AppText> : null}
        </Card>

        <ActionGroup title="Decisions">
          <SecondaryLink href={`/trips/${trip.id}/date-poll/setup`} label="Date poll setup" />
          <SecondaryLink href={`/trips/${trip.id}/date-poll/vote`} label="Vote on dates" />
          <SecondaryLink href={`/trips/${trip.id}/date-poll/results`} label="Date results" />
          <SecondaryLink href={`/trips/${trip.id}/destination/setup`} label="Destination setup" />
          <SecondaryLink href={`/trips/${trip.id}/destination`} label="Proposals" />
        </ActionGroup>

        <ActionGroup title="Plan and money">
          <SecondaryLink href={`/trips/${trip.id}/plan`} label="Trip plan" />
          <SecondaryLink href={`/trips/${trip.id}/plan/tasks`} label="Tasks" />
          <SecondaryLink href={`/trips/${trip.id}/expenses`} label="Expenses" />
          <SecondaryLink href={`/trips/${trip.id}/expenses/balances`} label="Balances" />
        </ActionGroup>

        <ActionGroup title="Group">
          <SecondaryLink href={`/trips/${trip.id}/invite`} label="Invite friends" />
          <SecondaryLink href={`/trips/${trip.id}/members`} label="Members" />
          <SecondaryLink href={`/trips/${trip.id}/activity`} label="Activity" />
          <SecondaryLink href={`/trips/${trip.id}/settings`} label="Settings" />
        </ActionGroup>
      </ScrollView>
    </Screen>
  );
}

function getPrimaryAction(trip: Trip): { label: string; href: string; disabled?: boolean } {
  if (trip.status === 'group_created') {
    return { label: 'Invite friends', href: `/trips/${trip.id}/invite` };
  }

  if (trip.status === 'voting_dates') {
    return { label: 'Vote on dates', href: `/trips/${trip.id}/date-poll/vote` };
  }

  if (trip.status === 'date_decided') {
    return { label: 'Set up destination vote', href: `/trips/${trip.id}/destination/setup` };
  }

  if (trip.status === 'voting_place') {
    return { label: 'View proposals', href: `/trips/${trip.id}/destination` };
  }

  if (trip.status === 'settling_expenses') {
    return { label: 'Review balances', href: `/trips/${trip.id}/expenses/balances` };
  }

  if (trip.status === 'closed') {
    return { label: 'View activity', href: `/trips/${trip.id}/activity` };
  }

  return { label: 'Open trip plan', href: `/trips/${trip.id}/plan` };
}

function ActionGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.actionGroup}>
      <AppText variant="eyebrow">{title}</AppText>
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

function SecondaryLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} asChild>
      <Button label={label} variant="secondary" />
    </Link>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    paddingVertical: 24,
  },
  actionGroup: {
    gap: 10,
  },
  actions: {
    gap: 10,
  },
});
