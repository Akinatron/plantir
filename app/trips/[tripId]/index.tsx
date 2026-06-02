/**
 * Trip dashboard — vista principal de un viaje.
 *
 * Muestra: nombre, estado, stepper, miembros, CTA principal según estado.
 */

import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, Avatar, AvatarStack } from '@/components';
import { useTrip } from '@/hooks/useTrip';
import { useTripMembers } from '@/hooks/useTripMembers';
import { useBalances } from '@/hooks/useBalances';
import { formatCents } from '@/lib/format';
import type { TripState } from '@/types';

const STATE_LABELS: Record<TripState, string> = {
  group_created: 'Grupo creado',
  voting_dates: 'Votando fechas',
  date_decided: 'Fecha decidida',
  voting_place: 'Votando sitio',
  place_decided: 'Sitio decidido',
  planning: 'Planificando',
  on_trip: 'De viaje',
  settling_expenses: 'Cerrando cuentas',
  closed: 'Cerrado',
};

const PRIMARY_CTA: Record<TripState, { label: string; route: string } | null> = {
  group_created: { label: 'Invitar amigos', route: 'invite' },
  voting_dates: { label: 'Votar fechas', route: 'date-poll/vote' },
  date_decided: { label: 'Proponer sitios', route: 'destination/proposals' },
  voting_place: { label: 'Votar sitios', route: 'destination/proposals' },
  place_decided: { label: 'Planificar', route: 'plan' },
  planning: { label: 'Añadir gasto', route: 'expenses/create' },
  on_trip: { label: 'Añadir gasto', route: 'expenses/create' },
  settling_expenses: { label: 'Ver balances', route: 'expenses/balances' },
  closed: null,
};

export default function TripDashboard() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { data: trip, isLoading } = useTrip(tripId as never);
  const { data: members } = useTripMembers(tripId as never);
  const { computed } = useBalances(tripId as never);

  if (isLoading || !trip) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface-base">
        <Text className="text-body text-neutral-600">Cargando…</Text>
      </SafeAreaView>
    );
  }

  const cta = PRIMARY_CTA[trip.state];
  const myBalance = computed?.balances.find(
    (b) => b.memberId === 'self', // simplificado; en producción cruzar con session.user.id
  );

  return (
    <SafeAreaView className="flex-1 bg-surface-base">
      <Stack.Screen options={{ title: trip.name }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Header */}
        <Card>
          <Text className="text-h2 text-neutral-900">{trip.name}</Text>
          {trip.description ? (
            <Text className="mt-1 text-body text-neutral-600">{trip.description}</Text>
          ) : null}
          <View className="mt-3 flex-row items-center gap-2">
            <View className="rounded-full bg-primary-50 px-3 py-1">
              <Text className="text-caption text-primary-700 font-semibold">
                {STATE_LABELS[trip.state]}
              </Text>
            </View>
            <Text className="text-caption text-neutral-600">
              Moneda: {trip.currency}
            </Text>
          </View>
        </Card>

        {/* Miembros */}
        <Card>
          <Text className="text-h3 text-neutral-900">Miembros</Text>
          {members && members.length > 0 ? (
            <View className="mt-3">
              <AvatarStack
                users={members.map((m) => ({
                  id: m.userId,
                  name: m.displayName,
                }))}
                maxVisible={5}
                size="md"
              />
              <Text className="mt-2 text-caption text-neutral-600">
                {members.length} {members.length === 1 ? 'persona' : 'personas'}
              </Text>
            </View>
          ) : (
            <Text className="mt-2 text-body text-neutral-600">Aún no hay miembros</Text>
          )}
        </Card>

        {/* Balance personal */}
        {myBalance ? (
          <Card>
            <Text className="text-h3 text-neutral-900">Tu balance</Text>
            <Text
              className={`mt-2 text-mono-lg ${
                (myBalance.netCents as unknown as number) >= 0
                  ? 'text-success'
                  : 'text-danger'
              }`}
            >
              {formatCents(myBalance.netCents, trip.currency)}
            </Text>
            <Text className="mt-1 text-caption text-neutral-600">
              {(myBalance.netCents as unknown as number) >= 0
                ? 'Te deben dinero'
                : 'Debes dinero al grupo'}
            </Text>
          </Card>
        ) : null}

        {/* CTA principal */}
        {cta ? (
          <Button
            label={cta.label}
            onPress={() => router.push(`/trips/${tripId}/${cta.route}`)}
            fullWidth
            size="lg"
          />
        ) : null}

        {/* Acciones secundarias */}
        <View className="flex-row gap-3 flex-wrap">
          <Button
            label="Gastos"
            variant="tertiary"
            onPress={() => router.push(`/trips/${tripId}/expenses`)}
          />
          <Button
            label="Balances"
            variant="tertiary"
            onPress={() => router.push(`/trips/${tripId}/expenses/balances`)}
          />
          <Button
            label="Miembros"
            variant="tertiary"
            onPress={() => router.push(`/trips/${tripId}/members`)}
          />
          <Button
            label="Invitar"
            variant="tertiary"
            onPress={() => router.push(`/trips/${tripId}/invite`)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
