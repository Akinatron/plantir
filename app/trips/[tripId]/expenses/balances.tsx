/**
 * Balances + Settlements del viaje.
 *
 * Muestra: balance por miembro y la lista optimizada de settlements
 * "X paga Y a Z €".
 */

import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Avatar } from '@/components';
import { useBalances } from '@/hooks/useBalances';
import { useTrip } from '@/hooks/useTrip';
import { useTripMembers } from '@/hooks/useTripMembers';
import { formatCents } from '@/lib/format';

export default function BalancesScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { data: trip } = useTrip(tripId as never);
  const { data: members } = useTripMembers(tripId as never);
  const { computed } = useBalances(tripId as never);

  if (!computed || !trip) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface-base">
        <Text className="text-body text-neutral-600">Cargando…</Text>
      </SafeAreaView>
    );
  }

  const memberById = new Map(members?.map((m) => [m.userId, m]) ?? []);

  return (
    <SafeAreaView className="flex-1 bg-surface-base">
      <Stack.Screen options={{ title: 'Balances' }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Card>
          <Text className="text-h3 text-neutral-900">Balances por persona</Text>
          <View className="mt-3 gap-2">
            {computed.balances.map((b) => {
              const member = memberById.get(b.memberId as unknown as string);
              const cents = b.netCents as unknown as number;
              return (
                <View
                  key={b.memberId}
                  className="flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-2 flex-1">
                    <Avatar name={member?.displayName ?? b.memberId} size="sm" />
                    <Text className="text-body text-neutral-900">
                      {member?.displayName ?? b.memberId}
                    </Text>
                  </View>
                  <Text
                    className={`text-mono ${
                      cents >= 0 ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {formatCents(b.netCents, trip.currency)}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        <Card>
          <Text className="text-h3 text-neutral-900">Liquidaciones sugeridas</Text>
          {computed.optimized.length === 0 ? (
            <Text className="mt-2 text-body text-neutral-600">
              Estáis en paz. No hay pagos pendientes.
            </Text>
          ) : (
            <View className="mt-3 gap-3">
              {computed.optimized.map((s, i) => {
                const from = memberById.get(s.fromMemberId as unknown as string);
                const to = memberById.get(s.toMemberId as unknown as string);
                return (
                  <View
                    key={i}
                    className="rounded-md bg-neutral-50 p-3 flex-row items-center justify-between"
                  >
                    <View className="flex-1">
                      <Text className="text-body text-neutral-900">
                        {from?.displayName ?? s.fromMemberId} → {to?.displayName ?? s.toMemberId}
                      </Text>
                      <Text className="text-caption text-neutral-600">
                        paga a
                      </Text>
                    </View>
                    <Text className="text-mono text-primary-700 font-semibold">
                      {formatCents(s.amountCents, s.currency)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
