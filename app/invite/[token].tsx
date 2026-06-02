/**
 * Pantalla de invitación — el usuario abre un link /invite/[token]
 * y se une al viaje.
 */

import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card } from '@/components';
import { invitesService } from '@/services/invites.service';
import { useSession } from '@/stores/session.store';

export default function Invite() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const session = useSession();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session.isHydrated && !session.user) {
      // Guardar el token y mandar a login.
      router.replace({ pathname: '/login', params: { returnTo: `/invite/${token}` } });
    }
  }, [session.isHydrated, session.user, token]);

  const onJoin = async () => {
    if (!token) return;
    setJoining(true);
    setError(null);
    const r = await invitesService.accept(token);
    setJoining(false);
    if (r.error) {
      setError(r.error.message);
      return;
    }
    router.replace(`/trips/${r.data.tripId}`);
  };

  if (!session.user) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface-base">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-base p-6">
      <Stack.Screen options={{ title: 'Invitación a viaje' }} />
      <Card>
        <Text className="text-h2 text-neutral-900">Te han invitado a un viaje</Text>
        <Text className="mt-2 text-body text-neutral-600">
          Únete para ver los detalles y empezar a votar fechas y destinos con el grupo.
        </Text>
        {error ? <Text className="mt-3 text-caption text-danger">{error}</Text> : null}
        <View className="mt-4">
          <Button
            label={joining ? 'Uniéndome…' : 'Unirme al viaje'}
            onPress={onJoin}
            loading={joining}
            fullWidth
            size="lg"
          />
        </View>
      </Card>
    </SafeAreaView>
  );
}
