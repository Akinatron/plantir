/**
 * Tabs layout: trips, notifications, profile.
 */

import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSession } from '@/stores/session.store';
import { Redirect } from 'expo-router';

export default function TabsLayout() {
  const session = useSession();
  if (session.isHydrated && !session.user) return <Redirect href="/welcome" />;

  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Viajes',
          tabBarLabel: 'Viajes',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>✈</Text>,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notificaciones',
          tabBarLabel: 'Notifs',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🔔</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
