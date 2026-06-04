import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../../src/components/feedback/LoadingState';
import { PlaceholderState } from '../../../../src/components/feedback/PlaceholderState';
import { AppText } from '../../../../src/components/ui/AppText';
import { Button } from '../../../../src/components/ui/Button';
import { Screen } from '../../../../src/components/ui/Screen';
import { TextField } from '../../../../src/components/ui/TextField';
import { useAuth } from '../../../../src/features/auth/AuthProvider';
import {
  useCreatePackingItemMutation,
  usePackingItemsQuery,
  useTogglePackingItemMutation,
} from '../../../../src/hooks/usePlanning';
import { useTripMembersQuery } from '../../../../src/hooks/useTrips';
import {
  CreatePackingItemFormValues,
  ParsedCreatePackingItemFormValues,
  createPackingItemSchema,
} from '../../../../src/lib/validation/planning';
import { PackingListItem } from '../../../../src/types/planning';
import { TripMember } from '../../../../src/types/trip';

export default function PackingScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useAuth();
  const itemsQuery = usePackingItemsQuery(tripId);
  const membersQuery = useTripMembersQuery(tripId);
  const createMutation = useCreatePackingItemMutation(tripId);
  const toggleMutation = useTogglePackingItemMutation(tripId, user?.id);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreatePackingItemFormValues, unknown, ParsedCreatePackingItemFormValues>({
    resolver: zodResolver(createPackingItemSchema),
    defaultValues: {
      tripId,
      createdBy: user?.id ?? '',
      label: '',
      quantity: '1',
      assignedTo: null,
    },
  });
  const assignedTo = useWatch({ control, name: 'assignedTo' });

  useEffect(() => {
    if (user?.id) {
      setValue('createdBy', user.id, { shouldValidate: true });
    }
  }, [setValue, user?.id]);

  if (itemsQuery.isLoading || membersQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading list..." />
      </Screen>
    );
  }

  const members = membersQuery.data ?? [];
  const onSubmit = handleSubmit(async (values) => {
    await createMutation.mutateAsync({
      ...values,
      tripId,
      createdBy: user?.id ?? values.createdBy,
    });
    reset({
      tripId,
      createdBy: user?.id ?? '',
      label: '',
      quantity: '1',
      assignedTo: null,
    });
  });

  return (
    <Screen>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <AppText variant="eyebrow">Shared list</AppText>
              <AppText variant="title">Packing</AppText>
            </View>
            {itemsQuery.error ? (
              <InlineNotice title="List failed to load" message={itemsQuery.error.message} tone="error" />
            ) : null}
            {createMutation.error ? (
              <InlineNotice title="Item failed to save" message={createMutation.error.message} tone="error" />
            ) : null}
            {toggleMutation.error ? (
              <InlineNotice title="Item update failed" message={toggleMutation.error.message} tone="error" />
            ) : null}
            {createMutation.isSuccess ? <InlineNotice title="Item added" tone="success" /> : null}
            {toggleMutation.isSuccess ? <InlineNotice title="List updated" tone="success" /> : null}
            <View style={styles.form}>
              <Controller
                control={control}
                name="label"
                render={({ field: { onBlur, onChange, value } }) => (
                  <TextField label="Item" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.label?.message} />
                )}
              />
              <Controller
                control={control}
                name="quantity"
                render={({ field: { onBlur, onChange, value } }) => (
                  <TextField
                    label="Quantity"
                    keyboardType="number-pad"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={errors.quantity?.message}
                  />
                )}
              />
              <View style={styles.assigneeList}>
                <AppText variant="eyebrow">Owner</AppText>
                <Pressable
                  style={[styles.memberRow, assignedTo === null && styles.memberRowSelected]}
                  onPress={() => setValue('assignedTo', null, { shouldDirty: true })}
                >
                  <AppText>Anyone</AppText>
                  <AppText>{assignedTo === null ? 'Selected' : 'Select'}</AppText>
                </Pressable>
                {members.map((member) => (
                  <MemberChoice
                    key={member.id}
                    member={member}
                    selected={assignedTo === member.userId}
                    onPress={() => setValue('assignedTo', member.userId, { shouldDirty: true })}
                  />
                ))}
              </View>
              <Button
                label={createMutation.isPending ? 'Saving...' : 'Add item'}
                onPress={onSubmit}
                disabled={!user || createMutation.isPending}
              />
            </View>
          </View>
        }
        contentContainerStyle={styles.list}
        data={itemsQuery.data ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<PlaceholderState title="No items yet" description="Add what the group needs to bring." />}
        renderItem={({ item }) => (
          <PackingItemCard
            item={item}
            members={members}
            disabled={toggleMutation.isPending}
            onToggle={() => toggleMutation.mutate(item)}
          />
        )}
      />
    </Screen>
  );
}

function MemberChoice({
  member,
  selected,
  onPress,
}: {
  member: TripMember;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.memberRow, selected && styles.memberRowSelected]} onPress={onPress}>
      <AppText>{member.displayName ?? 'Unnamed member'}</AppText>
      <AppText>{selected ? 'Selected' : 'Select'}</AppText>
    </Pressable>
  );
}

function PackingItemCard({
  item,
  members,
  disabled,
  onToggle,
}: {
  item: PackingListItem;
  members: TripMember[];
  disabled: boolean;
  onToggle: () => void;
}) {
  const assignee = members.find((member) => member.userId === item.assignedTo);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={`${item.label}, quantity ${item.quantity}`}
      accessibilityState={{ checked: item.isPacked, disabled }}
      disabled={disabled}
      onPress={onToggle}
      style={[styles.card, item.isPacked && styles.cardDone]}
    >
      <View style={styles.cardHeader}>
        <AppText variant="subtitle">{item.label}</AppText>
        <AppText>{item.isPacked ? 'Packed' : 'Missing'}</AppText>
      </View>
      <AppText>Quantity {item.quantity}</AppText>
      <AppText>Owner {assignee?.displayName ?? 'Anyone'}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 16,
    paddingTop: 24,
  },
  form: {
    gap: 12,
  },
  assigneeList: {
    gap: 8,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  memberRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAECF0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  memberRowSelected: {
    borderColor: '#0F6B57',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAECF0',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  cardDone: {
    opacity: 0.65,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
});
