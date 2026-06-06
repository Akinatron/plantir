import { useEffect, useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { UserRoundCheck } from 'lucide-react-native';

import { useAuth } from '../auth/AuthProvider';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { CalendarDateField } from '../../components/ui/CalendarDateField';
import { Card } from '../../components/ui/Card';
import { TextArea } from '../../components/ui/TextArea';
import { TextField } from '../../components/ui/TextField';
import { AppText } from '../../components/ui/AppText';
import { StateBanner } from '../../components/ui/StateBanner';
import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';
import { useCreateExpenseMutation } from '../../hooks/useExpenses';
import { useTripMembersQuery, useTripQuery } from '../../hooks/useTrips';
import {
  CreateExpenseFormValues,
  ParsedCreateExpenseFormValues,
  createExpenseSchema,
} from '../../lib/validation/expense';
import { TripMember } from '../../types/trip';
import { canManageTrip } from '../trip-admin/adminUtils';

type CreateExpenseSheetProps = {
  tripId: string;
  visible?: boolean;
  inline?: boolean;
  onClose?: () => void;
  onCreated?: (expenseId: string) => void;
};

export function CreateExpenseSheet({
  tripId,
  visible = true,
  inline = false,
  onClose,
  onCreated,
}: CreateExpenseSheetProps) {
  const { user } = useAuth();
  const tripQuery = useTripQuery(tripId);
  const membersQuery = useTripMembersQuery(tripId);
  const createMutation = useCreateExpenseMutation(tripId);
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
  const participantIds = useMemo(() => members.map((member) => member.userId), [members]);
  const {
    control,
    handleSubmit,
    setValue,
    reset,
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
  const [paidByUserId, excludedUserIds] = useWatch({
    control,
    name: ['paidByUserId', 'excludedUserIds'],
  });
  const canManage = canManageTrip(user?.id, members);
  const isReadOnly = Boolean(tripQuery.data?.closedAt);
  const canCreateExpense = Boolean(tripQuery.data && (tripQuery.data.memberCanCreateExpenses || canManage));
  const formDisabled = isReadOnly || !canCreateExpense || createMutation.isPending;

  useEffect(() => {
    if (user?.id) {
      setValue('createdBy', user.id, { shouldValidate: true });
    }
  }, [setValue, user?.id]);

  useEffect(() => {
    if (paidByUserId || members.length === 0) {
      return;
    }

    const fallbackPayer = members.find((member) => member.userId === user?.id) ?? members[0];

    if (fallbackPayer) {
      setValue('paidByUserId', fallbackPayer.userId, { shouldDirty: true, shouldValidate: true });
    }
  }, [members, paidByUserId, setValue, user?.id]);

  const submit = handleSubmit((values) => {
    createMutation.mutate(
      {
        ...values,
        tripId,
        createdBy: user?.id ?? values.createdBy,
        participantIds,
      },
      {
        onSuccess: (expense) => {
          reset();
          onCreated?.(expense.id);
          onClose?.();
        },
      },
    );
  });

  const content = (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {membersQuery.isLoading || tripQuery.isLoading ? <AppText>Loading trip details...</AppText> : null}
      {isReadOnly ? (
        <StateBanner title="Trip is read-only" message="Expenses cannot be added while this trip is closed." tone="locked" />
      ) : null}
      {!isReadOnly && tripQuery.data && !canCreateExpense ? (
        <StateBanner
          title="Permission denied"
          message="The owner or admin has disabled member-added expenses."
          tone="locked"
        />
      ) : null}
      {createMutation.isError ? (
        <Card variant="soft">
          <AppText variant="bodyStrong" style={styles.errorText}>
            Expense failed to save
          </AppText>
          <AppText>{createMutation.error.message}</AppText>
        </Card>
      ) : null}

      <Controller
        control={control}
        name="title"
        render={({ field }) => (
          <TextField
            label="Title"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.title?.message}
            placeholder="Groceries, taxi, dinner..."
            editable={!formDisabled}
          />
        )}
      />

      <View style={styles.row}>
        <View style={styles.amountField}>
          <Controller
            control={control}
            name="amountCents"
            render={({ field }) => (
              <TextField
                label="Amount"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.amountCents?.message}
                keyboardType="decimal-pad"
                placeholder="23.50"
                editable={!formDisabled}
              />
            )}
          />
        </View>
        <View style={styles.currencyField}>
          <Controller
            control={control}
            name="currencyCode"
            render={({ field }) => (
              <TextField
                label="Currency"
                value={field.value}
                onChangeText={(value) => field.onChange(value.toUpperCase())}
                onBlur={field.onBlur}
                error={errors.currencyCode?.message}
                autoCapitalize="characters"
                maxLength={3}
                editable={!formDisabled}
              />
            )}
          />
        </View>
      </View>

      <Controller
        control={control}
        name="category"
        render={({ field }) => (
          <TextField
            label="Category"
            value={field.value ?? ''}
            onChangeText={(value) => field.onChange(value.trim() ? value : null)}
            onBlur={field.onBlur}
            error={errors.category?.message}
            placeholder="Food, transport, stay..."
            editable={!formDisabled}
          />
        )}
      />

      <Controller
        control={control}
        name="expenseDate"
        render={({ field }) => (
          <CalendarDateField
            label="Paid date"
            value={field.value}
            onChange={(nextDate) => field.onChange(nextDate ?? '')}
            allowClear={false}
            error={errors.expenseDate?.message}
            disabled={formDisabled}
          />
        )}
      />

      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextArea
            label="Description"
            value={field.value ?? ''}
            onChangeText={(value) => field.onChange(value.trim() ? value : null)}
            onBlur={field.onBlur}
            error={errors.description?.message}
            placeholder="Optional note."
            editable={!formDisabled}
          />
        )}
      />

      <View style={styles.section}>
        <AppText variant="subtitle">Paid by</AppText>
        {members.map((member) => (
          <MemberChoice
            key={member.id}
            member={member}
            selected={paidByUserId === member.userId}
            selectedLabel="Payer"
            unselectedLabel="Select"
            disabled={formDisabled}
            onPress={() => setValue('paidByUserId', member.userId, { shouldDirty: true, shouldValidate: true })}
          />
        ))}
        {errors.paidByUserId ? <AppText style={styles.errorText}>{errors.paidByUserId.message}</AppText> : null}
      </View>

      <View style={styles.section}>
        <AppText variant="subtitle">Exclude from equal split</AppText>
        {members.map((member) => (
          <MemberChoice
            key={member.id}
            member={member}
            selected={(excludedUserIds ?? []).includes(member.userId)}
            selectedLabel="Excluded"
            unselectedLabel="Included"
            disabled={formDisabled}
            onPress={() => {
              const current = excludedUserIds ?? [];
              setValue(
                'excludedUserIds',
                current.includes(member.userId)
                  ? current.filter((userId) => userId !== member.userId)
                  : [...current, member.userId],
                { shouldDirty: true, shouldValidate: true },
              );
            }}
          />
        ))}
        {errors.excludedUserIds ? <AppText style={styles.errorText}>{errors.excludedUserIds.message}</AppText> : null}
      </View>
    </ScrollView>
  );

  const footer = (
    <Button
      label="Save expense"
      loading={createMutation.isPending}
      disabled={!user || formDisabled || members.length === 0}
      onPress={submit}
    />
  );

  if (inline) {
    return (
      <Card>
        <AppText variant="subtitle">Add expense</AppText>
        {content}
        {footer}
      </Card>
    );
  }

  return (
    <BottomSheet
      visible={visible}
      title="Add shared cost"
      subtitle="Split equally by default and exclude anyone who should not pay."
      footer={footer}
      onClose={onClose ?? (() => undefined)}
    >
      {content}
    </BottomSheet>
  );
}

function MemberChoice({
  member,
  selected,
  selectedLabel,
  unselectedLabel,
  onPress,
  disabled = false,
}: {
  member: TripMember;
  selected: boolean;
  selectedLabel: string;
  unselectedLabel: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.memberRow,
        selected && styles.memberSelected,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={styles.memberCopy}>
        <View style={styles.memberIcon}>
          <UserRoundCheck color={selected ? colors.primary : colors.textMuted} size={18} />
        </View>
        <View>
          <AppText variant="bodyStrong">{member.displayName ?? 'Unnamed member'}</AppText>
          <AppText variant="caption">{member.role}</AppText>
        </View>
      </View>
      <AppText variant="caption">{selected ? selectedLabel : unselectedLabel}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[4],
    paddingBottom: spacing[3],
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  amountField: {
    flexBasis: 180,
    flexGrow: 1,
  },
  currencyField: {
    flexBasis: 110,
    flexGrow: 0.3,
  },
  section: {
    gap: spacing[3],
  },
  memberRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
    minHeight: 64,
    padding: spacing[3],
  },
  memberSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  memberCopy: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  memberIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSea,
    borderRadius: radius.full,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.58,
  },
  errorText: {
    color: colors.danger,
  },
});
