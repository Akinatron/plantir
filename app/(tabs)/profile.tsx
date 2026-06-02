/**
 * Perfil del usuario + logout.
 */

import { View, Text, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Button } from '@/components';
import { useSession } from '@/stores/session.store';
import { authService } from '@/services/auth.service';
import { sessionStore } from '@/stores/session.store';

export default function ProfileScreen() {
  const session = useSession();
  const profile = session.user?.user_metadata;

  const onLogout = async () => {
    const r = await authService.signOut();
    if (r.error) {
      Alert.alert('Error', r.error.message);
      return;
    }
    sessionStore.getState().clear();
    router.replace('/welcome');
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-base p-6">
      <View className="items-center mt-6">
        <Avatar
          name={(profile?.display_name as string) ?? session.user?.email ?? '?'}
          size="xl"
        />
        <Text className="mt-3 text-h2 text-neutral-900">
          {(profile?.display_name as string) ?? 'Sin nombre'}
        </Text>
        <Text className="text-body text-neutral-600">{session.user?.email}</Text>
      </View>
      <View className="mt-auto">
        <Button
          label="Cerrar sesión"
          onPress={onLogout}
          variant="danger"
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
