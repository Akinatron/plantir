import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../src/components/feedback/InlineNotice';
import { AppText } from '../../src/components/ui/AppText';
import { Button } from '../../src/components/ui/Button';
import { CalendarDateField } from '../../src/components/ui/CalendarDateField';
import { Screen } from '../../src/components/ui/Screen';
import { TextField } from '../../src/components/ui/TextField';
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

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <AppText variant="eyebrow">New trip</AppText>
          <AppText variant="title">Create the group</AppText>
          <AppText>Start with the basic trip space. Dates and places come next.</AppText>
        </View>

        {createTripMutation.error ? (
          <InlineNotice title="Trip creation failed" message={createTripMutation.error.message} tone="error" />
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
              <TextField
                label="Description"
                placeholder="Optional"
                multiline
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
              />
            )}
          />
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

        <Button
          label={createTripMutation.isPending ? 'Creating...' : 'Create trip'}
          onPress={onSubmit}
          disabled={!user || createTripMutation.isPending}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 22,
    paddingVertical: 24,
  },
  header: {
    gap: 8,
  },
  form: {
    gap: 16,
  },
});
