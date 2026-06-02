/**
 * Pantalla principal: lista de viajes del usuario.
 */

import { View, Text, FlatList, Pressable } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, Avatar } from '@/components';
import { useTrips } from '@/hooks/useTrip';
import { formatDateRange } from '@/lib/format';

export default function TripsScreen() {
  const { data: trips, isLoading, error } = useTrips();

  return (
    <SafeAreaView className="flex-1 bg-surface-base">
      <View className="flex-row items-center justify-between p-4">
        <Text className="text-h2 text-neutral-900">Tus viajes</Text>
        <Link href="/trips/create" asChild>
          <Button label="+ Nuevo" onPress={() => {}} />
        </Link>
      </View>
      {isLoading ? (
        <Text className="p-4 text-neutral-600">Cargando…</Text>
      ) : error ? (
        <Text className="p-4 text-danger">Error: {error.message}</Text>
      ) : trips && trips.length > 0 ? (
        <FlatList
          data={trips}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/trips/${item.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir viaje ${item.name}`}
            >
              <Card>
                <View className="flex-row items-center gap-3">
                  <Avatar name={item.name} size="lg" />
                  <View className="flex-1">
                    <Text className="text-h3 text-neutral-900">{item.name}</Text>
                    {item.startDate && item.endDate ? (
                      <Text className="text-caption text-neutral-600">
                        {formatDateRange(item.startDate, item.endDate)}
                      </Text>
                    ) : (
                      <Text className="text-caption text-neutral-600">Sin fechas</Text>
                    )}
                    <Text className="mt-1 text-caption text-primary-500">
                      {item.state}
                    </Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          )}
        />
      ) : (
        <View className="flex-1 items-center justify-center p-8">
          <Text className="text-h3 text-neutral-900 text-center">
            Aún no tienes viajes
          </Text>
          <Text className="mt-2 text-body text-neutral-600 text-center">
            Crea el primero e invita a tus amigos.
          </Text>
          <View className="mt-6">
            <Link href="/trips/create" asChild>
              <Button label="Crear mi primer viaje" onPress={() => {}} size="lg" />
            </Link>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
