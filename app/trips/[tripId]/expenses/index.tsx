/**
 * Expenses list — lista de gastos del viaje.
 */

import { View, Text, FlatList, Pressable } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from '@/components';
import { useExpenses } from '@/hooks/useExpenses';
import { formatCents, formatDate } from '@/lib/format';
import { useTrip } from '@/hooks/useTrip';

export default function ExpensesList() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { data: trip } = useTrip(tripId as never);
  const { data: expenses, isLoading } = useExpenses(tripId as never);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface-base">
        <Text className="text-body text-neutral-600">Cargando…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-base">
      <Stack.Screen options={{ title: 'Gastos' }} />
      <View className="flex-row items-center justify-between p-4">
        <Text className="text-h2 text-neutral-900">
          Gastos ({(expenses ?? []).length})
        </Text>
        <Button
          label="+ Añadir"
          onPress={() => router.push(`/trips/${tripId}/expenses/create`)}
        />
      </View>
      <FlatList
        data={expenses ?? []}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/trips/${tripId}/expenses/${item.id}`)}
          >
            <Card padding="sm">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-body font-semibold text-neutral-900">
                    {item.title}
                  </Text>
                  <Text className="text-caption text-neutral-600">
                    {item.category} · {formatDate(item.date)}
                  </Text>
                </View>
                <Text className="text-mono text-neutral-900">
                  {formatCents(item.amountCents, trip?.currency ?? 'EUR')}
                </Text>
              </View>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center p-8">
            <Text className="text-h3 text-neutral-900">Sin gastos aún</Text>
            <Text className="mt-2 text-body text-neutral-600 text-center">
              Añade el primer gasto del viaje para empezar a cuadrar cuentas.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
