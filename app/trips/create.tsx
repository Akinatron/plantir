/**
 * Crear viaje.
 */

import { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Card } from '@/components';
import { tripsService } from '@/services/trips.service';
import { useQueryClient } from '@tanstack/react-query';
import type { CurrencyCode } from '@/types';

export default function CreateTrip() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('EUR' as CurrencyCode);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Ponle un nombre al viaje.');
      return;
    }
    setLoading(true);
    const r = await tripsService.create({
      name: name.trim(),
      description: description.trim() || null,
      currency,
    });
    setLoading(false);
    if (r.error) {
      Alert.alert('Error', r.error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['trips'] });
    router.replace(`/trips/${r.data.id}/invite`);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-base">
      <Stack.Screen options={{ title: 'Crear viaje' }} />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-h2 text-neutral-900">Nuevo viaje</Text>
        <Input
          label="Nombre"
          value={name}
          onChangeText={setName}
          placeholder="Ej. Casa rural en Asturias"
          required
        />
        <Input
          label="Descripción (opcional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Una línea para el grupo"
          multiline
        />
        <Card padding="sm">
          <Text className="text-body-sm font-medium text-neutral-800 mb-2">
            Moneda principal
          </Text>
          <View className="flex-row gap-2">
            {(['EUR', 'USD', 'GBP', 'MXN'] as const).map((c) => (
              <View
                key={c}
                className={`px-3 py-1.5 rounded-full ${
                  currency === c ? 'bg-primary-500' : 'bg-neutral-100'
                }`}
              >
                <Text
                  onPress={() => setCurrency(c as CurrencyCode)}
                  className={currency === c ? 'text-white font-semibold' : 'text-neutral-800'}
                >
                  {c}
                </Text>
              </View>
            ))}
          </View>
        </Card>
        <Button
          label={loading ? 'Creando…' : 'Crear viaje'}
          onPress={onSubmit}
          loading={loading}
          fullWidth
          size="lg"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
