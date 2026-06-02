/**
 * Login — email + password.
 */

import { useState } from 'react';
import { Stack, router } from 'expo-router';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '@/components';
import { authService } from '@/services/auth.service';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    const r = await authService.signIn({ email, password });
    setLoading(false);
    if (r.error) {
      setError(r.error.message);
      return;
    }
    router.replace('/(tabs)/trips');
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-base p-6">
      <Stack.Screen options={{ title: 'Iniciar sesión' }} />
      <Text className="text-h1 text-neutral-900 mb-6">Iniciar sesión</Text>
      <View className="gap-3">
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="tu@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          required
        />
        <Input
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          placeholder="Tu contraseña"
          secureTextEntry
          required
        />
        {error ? <Text className="text-caption text-danger">{error}</Text> : null}
        <Button
          label={loading ? 'Entrando…' : 'Entrar'}
          onPress={onSubmit}
          loading={loading}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
