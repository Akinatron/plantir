/**
 * Pantalla de "no encontrado".
 */

import { View, Text } from 'react-native';
import { Link, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components';

export default function NotFound() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-surface-base p-6">
      <Stack.Screen options={{ title: 'No encontrado' }} />
      <Text className="text-h1 text-neutral-900">404</Text>
      <Text className="mt-2 text-body text-neutral-600 text-center">
        No hemos encontrado lo que buscabas.
      </Text>
      <View className="mt-6">
        <Link href="/" asChild>
          <Button label="Volver al inicio" onPress={() => {}} />
        </Link>
      </View>
    </SafeAreaView>
  );
}
