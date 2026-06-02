/**
 * Notifications — bandeja in-app.
 */

import { View, Text, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsScreen() {
  // TODO Fase 3: hook useNotifications con TanStack Query.
  const items: Notification[] = [];

  return (
    <SafeAreaView className="flex-1 bg-surface-base">
      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <Text className="text-h3 text-neutral-900">Sin notificaciones</Text>
          <Text className="mt-2 text-body text-neutral-600 text-center">
            Aquí verás avisos de invitaciones, pagos y recordatorios.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => (
            <View className="rounded-md bg-surface-raised p-4">
              <Text className="text-body font-semibold text-neutral-900">
                {item.title}
              </Text>
              <Text className="mt-1 text-body-sm text-neutral-600">{item.body}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
