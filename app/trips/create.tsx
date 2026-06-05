import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { ArrowLeft, CalendarDays, UsersRound } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../src/components/feedback/InlineNotice';
import { AppText } from '../../src/components/ui/AppText';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { CalendarDateField } from '../../src/components/ui/CalendarDateField';
import { Chip } from '../../src/components/ui/Chip';
import { Screen } from '../../src/components/ui/Screen';
import { TextArea } from '../../src/components/ui/TextArea';
import { TextField } from '../../src/components/ui/TextField';
import { colors } from '../../src/design/theme';
import { radius, spacing } from '../../src/design/spacing';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { useCreateTripMutation } from '../../src/hooks/useTrips';
import { CreateTripFormValues, createTripSchema } from '../../src/lib/validation/trip';

export default function CreateTripScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const createTripMutation = useCreateTripMutation(user?.id);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTripFormValues>({
    resolver: zodResolver(createTripSchema),
    defaultValues: {
      title: '',
      description: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      startsOn: null,
      endsOn: null,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const trip = await createTripMutation.mutateAsync(values);
    router.replace(`/trips/${trip.id}`);
  });

  const onBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/trips');
  };

  return (
    <Screen scroll contentContainerStyle={styles.screenContent}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to trips" onPress={onBack} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={20} strokeWidth={2.2} />
        </Pressable>
      </View>

      <View style={styles.header}>
        <Chip label="New trip" tone="sea" />
        <AppText variant="display">Create the group</AppText>
        <AppText variant="body">
          Start with a shared space. Dates, places, money, and planning come next.
        </AppText>
      </View>

      <View style={styles.layout}>
        <Card variant="elevated" padding="lg" style={styles.formCard}>
          {createTripMutation.error ? (
            <InlineNotice title="Trip creation failed" message={createTripMutation.error.message} tone="error" />
          ) : null}

          {!user ? (
            <InlineNotice title="Login required" message="Log in before creating a trip." tone="error" />
          ) : null}

          <View style={styles.form}>
            <Controller
              control={control}
              name="title"
              render={({ field: { onBlur, onChange, value } }) => (
                <TextField
                  label="Trip name"
                  placeholder="Summer house weekend"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.title?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="description"
              render={({ field: { onBlur, onChange, value } }) => (
                <TextArea
                  label="Description"
                  placeholder="Optional note for the group"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.description?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="timezone"
              render={({ field: { onBlur, onChange, value } }) => (
                <TextField
                  label="Timezone"
                  autoCapitalize="none"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.timezone?.message}
                  hint="Used for deadlines and trip notifications."
                />
              )}
            />

            <View style={styles.dateGrid}>
              <Controller
                control={control}
                name="startsOn"
                render={({ field: { onChange, value } }) => (
                  <CalendarDateField
                    label="Start date"
                    value={value}
                    onChange={onChange}
                    error={errors.startsOn?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="endsOn"
                render={({ field: { onChange, value } }) => (
                  <CalendarDateField
                    label="End date"
                    value={value}
                    onChange={onChange}
                    error={errors.endsOn?.message}
                  />
                )}
              />
            </View>
          </View>

          <Button
            label={createTripMutation.isPending ? 'Creating...' : 'Create trip'}
            onPress={onSubmit}
            disabled={!user || createTripMutation.isPending}
            loading={createTripMutation.isPending}
          />
        </Card>

        <Card variant="soft" padding="lg" style={styles.sideCard}>
          <View style={styles.sideItem}>
            <View style={styles.sideIcon}>
              <UsersRound color={colors.primary} size={20} strokeWidth={2.2} />
            </View>
            <View style={styles.sideCopy}>
              <AppText variant="bodyStrong">Invite people after creation</AppText>
              <AppText variant="caption">The owner can create secure invite links from the trip dashboard.</AppText>
            </View>
          </View>
          <View style={styles.sideItem}>
            <View style={styles.sideIcon}>
              <CalendarDays color={colors.primary} size={20} strokeWidth={2.2} />
            </View>
            <View style={styles.sideCopy}>
              <AppText variant="bodyStrong">Dates can still be voted later</AppText>
              <AppText variant="caption">These dates are optional. The date poll is the real group decision.</AppText>
            </View>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing[5],
    paddingVertical: spacing[6],
  },
  topBar: {
    alignItems: 'flex-start',
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  header: {
    gap: spacing[2],
    maxWidth: 680,
  },
  layout: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[5],
  },
  formCard: {
    flex: 1,
    minWidth: 300,
  },
  form: {
    gap: spacing[4],
  },
  dateGrid: {
    gap: spacing[4],
  },
  sideCard: {
    flex: 0.7,
    minWidth: 260,
  },
  sideItem: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  sideIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSea,
    borderRadius: radius.lg,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  sideCopy: {
    flex: 1,
    gap: spacing[1],
  },
});
