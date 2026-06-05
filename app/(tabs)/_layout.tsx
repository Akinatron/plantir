import { Tabs } from 'expo-router';
import { Bell, CircleUserRound, Map } from 'lucide-react-native';

import { colors } from '../../src/design/theme';
import { spacing } from '../../src/design/spacing';
import { typography } from '../../src/design/typography';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          ...typography.label,
          color: colors.text,
        },
        sceneStyle: {
          backgroundColor: colors.background,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarLabelStyle: {
          ...typography.caption,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          minHeight: 64,
          paddingBottom: spacing[2],
          paddingTop: spacing[2],
        },
      }}
    >
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color, size }) => <Map color={color} size={size} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <CircleUserRound color={color} size={size} strokeWidth={2.2} />,
        }}
      />
    </Tabs>
  );
}
