/**
 * Welcome — landing con CTA a login y signup.
 */

import { Link, Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';

export default function Welcome() {
  return (
    <SafeAreaView className="flex-1 bg-surface-base">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-display text-primary-500 text-center">Plantir</Text>
        <Text className="mt-3 text-body-lg text-neutral-600 text-center">
          Crea el grupo, elegid fecha y sitio, y dividid los gastos.
        </Text>
      </View>
      <View className="p-6 gap-3">
        <Link href="/signup" asChild>
          <Button label="Crear cuenta" onPress={() => {}} fullWidth size="lg" />
        </Link>
        <Link href="/login" asChild>
          <Button
            label="Ya tengo cuenta"
            onPress={() => {}}
            variant="tertiary"
            fullWidth
            size="lg"
          />
        </Link>
      </View>
    </SafeAreaView>
  );
}
