/**
 * Create expense — modal con formulario (RHF + Zod).
 */

import { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Card } from '@/components';
import { useCreateExpense } from '@/hooks/useExpenses';
import { useTrip } from '@/hooks/useTrip';
import { useTripMembers } from '@/hooks/useTripMembers';
import type { Cents, CreateExpenseInput, TripId } from '@/types';

export default function CreateExpense() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { data: trip } = useTrip(tripId as never);
  const { data: members } = useTripMembers(tripId as never);
  const create = useCreateExpense(tripId as TripId);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CreateExpenseInput['category']>('food');
  const [paidByMemberId, setPaidByMemberId] = useState<string>('');
  const [splitAll, setSplitAll] = useState(true);

  const onSubmit = async () => {
    if (!trip || !members) return;
    const amountCents: Cents = Math.round(parseFloat(amount) * 100) as Cents;
    if (!title || !amount || !paidByMemberId) {
      Alert.alert('Faltan datos', 'Rellena título, importe y pagador.');
      return;
    }
    if (!splitAll) {
      Alert.alert('Por ahora', 'Solo está implementado el split entre todos.');
      return;
    }
    const r = await create.mutateAsync({
      title,
      category,
      type: 'expense',
      amountCents,
      currency: trip.currency,
      paidAt: new Date().toISOString().slice(0, 10),
      payers: [{ memberId: paidByMemberId as never, amountCents }],
      splits: members.map((m) => ({
        memberId: m.userId as never,
        splitType: 'equal',
        included: true,
      })),
    } as Omit<CreateExpenseInput, 'tripId'>);
    if (r.error) {
      Alert.alert('Error', r.error.message);
      return;
    }
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-base">
      <Stack.Screen options={{ title: 'Añadir gasto' }} />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-h2 text-neutral-900">Nuevo gasto</Text>
        <Input
          label="Título"
          value={title}
          onChangeText={setTitle}
          placeholder="Cena del viernes"
          required
        />
        <Input
          label={`Importe (${trip?.currency ?? 'EUR'})`}
          value={amount}
          onChangeText={setAmount}
          placeholder="0,00"
          keyboardType="decimal-pad"
          required
        />
        <Card padding="sm">
          <Text className="text-body-sm font-medium text-neutral-800 mb-2">
            Pagado por
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {members?.map((m) => {
              const active = paidByMemberId === m.userId;
              return (
                <View
                  key={m.id}
                  className={`mr-2 px-3 py-2 rounded-full ${
                    active ? 'bg-primary-500' : 'bg-neutral-100'
                  }`}
                >
                  <Text
                    onPress={() => setPaidByMemberId(m.userId)}
                    className={active ? 'text-white font-semibold' : 'text-neutral-800'}
                  >
                    {m.displayName}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </Card>
        <Card padding="sm">
          <Text className="text-body-sm font-medium text-neutral-800 mb-2">
            Categoría
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {(['food', 'lodging', 'transport', 'activities', 'shopping', 'other'] as const).map(
              (c) => (
                <View
                  key={c}
                  className={`px-3 py-1.5 rounded-full ${
                    category === c ? 'bg-primary-500' : 'bg-neutral-100'
                  }`}
                >
                  <Text
                    onPress={() => setCategory(c)}
                    className={category === c ? 'text-white font-semibold' : 'text-neutral-800'}
                  >
                    {c}
                  </Text>
                </View>
              ),
            )}
          </View>
        </Card>
        <Card padding="sm">
          <Text className="text-body-sm font-medium text-neutral-800">Reparto</Text>
          <Text
            onPress={() => setSplitAll(true)}
            className={`mt-2 ${splitAll ? 'text-primary-700 font-semibold' : 'text-neutral-600'}`}
          >
            ✓ Entre todos a partes iguales
          </Text>
        </Card>
        <Button
          label={create.isPending ? 'Guardando…' : 'Guardar gasto'}
          onPress={onSubmit}
          loading={create.isPending}
          fullWidth
          size="lg"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
