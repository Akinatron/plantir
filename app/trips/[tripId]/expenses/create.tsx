import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../../src/components/feedback/LoadingState';
import { AppText } from '../../../../src/components/ui/AppText';
import { Button } from '../../../../src/components/ui/Button';
import { CalendarDateField } from '../../../../src/components/ui/CalendarDateField';
import { Screen } from '../../../../src/components/ui/Screen';
import { TextField } from '../../../../src/components/ui/TextField';
import { useAuth } from '../../../../src/features/auth/AuthProvider';
import { useCreateExpenseMutation } from '../../../../src/hooks/useExpenses';
import { useTripMembersQuery } from '../../../../src/hooks/useTrips';
import {
  CreateExpenseFormValues,
  ParsedCreateExpenseFormValues,
  createExpenseSchema,
} from '../../../../src/lib/validation/expense';
import { TripMember } from '../../../../src/types/trip';

export default function CreateExpenseScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useAuth();
  const membersQuery = useTripMembersQuery(tripId);
  const createMutation = useCreateExpenseMutation(tripId);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateExpenseFormValues, unknown, ParsedCreateExpenseFormValues>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      tripId,
      createdBy: user?.id ?? '',
      title: '',
      description: null,
      category: null,
      amountCents: '',
      currencyCode: 'EUR',
      paidByUserId: user?.id ?? '',
      participantIds: [],
      excludedUserIds: [],
      expenseDate: new Date().toISOString().slice(0, 10),
    },
  });
  const paidByUserId = useWatch({ control, name: 'paidByUserId' });
  const excludedUserIds = useWatch({ control, name: 'excludedUserIds' });

  useEffect(() => {
    if (user?.id) {
      setValue('createdBy', user.id, { shouldValidate: true });
    }
  }, [setValue, user?.id]);

  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
  const participantIds = useMemo(() => members.map((member) => member.userId), [members]);

  useEffect(() => {
    if (paidByUserId || members.length === 0) {
      return;
    }

    const fallbackPayer = members.find((member) => member.userId === user?.id) ?? members[0];

    if (fallbackPayer) {
      setValue('paidByUserId', fallbackPayer.userId, { shouldDirty: true, shouldValidate: true });
    }
  }, [members, paidByUserId, setValue, user?.id]);

  if (membersQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading members..." />
      </Screen>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    const expense = await createMutation.mutateAsync({
      ...values,
      tripId,
      createdBy: user?.id ?? values.createdBy,
      participantIds,
    });
    router.replace(`/trips/${tripId}/expenses/${expense.id}`);
  });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <AppText variant="eyebrow">Expense</AppText>
          <AppText variant="title">Add shared cost</AppText>
        </View>

        {createMutation.error ? (
          <InlineNotice title="Expense failed to save" message={createMutation.error.message} tone="error" />
        ) : null}

        <View style={styles.form}>
          <Controller
            control={control}
            name="title"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField label="Title" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.title?.message} />
            )}
          />
          <Controller
            control={control}
            name="description"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Description"
                multiline
                onBlur={onBlur}
                onChangeText={(text) => onChange(text.trim().length > 0 ? text : null)}
                value={value ?? ''}
                error={errors.description?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="category"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Category"
                placeholder="Groceries"
                onBlur={onBlur}
                onChangeText={(text) => onChange(text.trim().length > 0 ? text : null)}
                value={value ?? ''}
                error={errors.category?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="amountCents"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Amount"
                keyboardType="decimal-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.amountCents?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="currencyCode"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Currency"
                autoCapitalize="characters"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.currencyCode?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="expenseDate"
            render={({ field: { onChange, value } }) => (
              <CalendarDateField
                label="Paid date"
                value={value}
                onChange={(nextDate) => onChange(nextDate ?? '')}
                allowClear={false}
                error={errors.expenseDate?.message}
              />
            )}
          />
        </View>

        <View style={styles.section}>
          <AppText variant="subtitle">Paid by</AppText>
          {members.map((member) => (
            <SelectableMember
              key={member.id}
              member={member}
              selected={paidByUserId === member.userId}
              onPress={() => setValue('paidByUserId', member.userId, { shouldDirty: true })}
            />
          ))}
          {errors.paidByUserId ? <AppText>{errors.paidByUserId.message}</AppText> : null}
        </View>

        <View style={styles.section}>
          <AppText variant="subtitle">Exclude from equal split</AppText>
          {members.map((member) => (
            <SelectableMember
              key={member.id}
              member={member}
              selected={excludedUserIds.includes(member.userId)}
              selectedLabel="Excluded"
              unselectedLabel="Included"
              onPress={() => {
                setValue(
                  'excludedUserIds',
                  excludedUserIds.includes(member.userId)
                    ? excludedUserIds.filter((userId) => userId !== member.userId)
                    : [...excludedUserIds, member.userId],
                  { shouldDirty: true },
                );
              }}
            />
          ))}
          {errors.excludedUserIds ? <AppText>{errors.excludedUserIds.message}</AppText> : null}
        </View>

        <Button
          label={createMutation.isPending ? 'Saving...' : 'Save expense'}
          onPress={onSubmit}
          disabled={!user || createMutation.isPending || members.length === 0}
        />
      </ScrollView>
    </Screen>
  );
}

function SelectableMember({
  member,
  selected,
  selectedLabel = 'Selected',
  unselectedLabel = 'Select',
  onPress,
}: {
  member: TripMember;
  selected: boolean;
  selectedLabel?: string;
  unselectedLabel?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.memberRow, selected && styles.memberRowSelected]} onPress={onPress}>
      <View>
        <AppText variant="subtitle">{member.displayName ?? 'Unnamed member'}</AppText>
        <AppText>{member.role}</AppText>
      </View>
      <AppText>{selected ? selectedLabel : unselectedLabel}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingVertical: 24,
  },
  header: {
    gap: 8,
  },
  form: {
    gap: 14,
  },
  section: {
    gap: 10,
  },
  memberRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAECF0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  memberRowSelected: {
    borderColor: '#0F6B57',
  },
});
