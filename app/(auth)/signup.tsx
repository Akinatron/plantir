/**
 * Signup — email + password + display name.
 */

import { useState } from 'react';
import { Stack, router } from 'expo-router';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '@/components';
import { authService } from '@/services/auth.service';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    const r = await authService.signUp({ email, password, displayName });
    setLoading(false);
    if (r.error) {
      setError(r.error.message);
      return;
    }
    if (r.data.session) {
      router.replace('/(tabs)/trips');
    } else {
      Alert.alert(
        'Confirma tu email',
        'Te hemos enviado un enlace de confirmación. Ábrelo para activar tu cuenta.',
      );
      router.replace('/login');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-base p-6">
      <Stack.Screen options={{ title: 'Crear cuenta' }} />
      <Text className="text-h1 text-neutral-900 mb-6">Crear cuenta</Text>
      <View className="gap-3">
        <Input
          label="Nombre"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Tu nombre"
          required
        />
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
          placeholder="Mínimo 8 caracteres"
          secureTextEntry
          required
        />
        {error ? <Text className="text-caption text-danger">{error}</Text> : null}
        <Button
          label={loading ? 'Creando cuenta…' : 'Crear cuenta'}
          onPress={onSubmit}
          loading={loading}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
