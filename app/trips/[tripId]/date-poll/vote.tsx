/**
 * Date poll — votación.
 *
 * Pantalla modal donde el usuario marca su disponibilidad en los rangos
 * permitidos. Sube sus votos al servidor al hacer submit.
 *
 * Decisión UX: usamos 4 botones por día (sí / prefiero / tal vez / no)
 * con heatmap visual basado en selecciones previas del grupo.
 */

import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card } from '@/components';
import { useDatePoll } from '@/hooks/useDatePoll';
import { pollsService } from '@/services/polls.service';
import { useSession } from '@/stores/session.store';
import type { Availability } from '@/types';

type Vote = { start: string; end: string; availability: Availability };

const AVAILABILITIES: Array<{ value: Availability; label: string; color: string }> = [
  { value: 'available', label: 'Sí', color: 'bg-success' },
  { value: 'prefer', label: 'Prefiero', color: 'bg-primary-500' },
  { value: 'maybe', label: 'Tal vez', color: 'bg-warning' },
  { value: 'unavailable', label: 'No', color: 'bg-danger' },
];

function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start);
  const e = new Date(end);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export default function DatePollVote() {
  const { tripId, pollId } = useLocalSearchParams<{
    tripId: string;
    pollId: string;
  }>();
  const { allowedRanges, myVotes } = useDatePoll(pollId as never);
  const session = useSession();
  const [votes, setVotes] = useState<Record<string, Availability>>({});
  const [saving, setSaving] = useState(false);

  // Inicializa con los votos existentes del usuario.
  useState(() => {
    if (myVotes.data) {
      const map: Record<string, Availability> = {};
      for (const v of myVotes.data) {
        for (const d of eachDay(v.startDate, v.endDate)) {
          map[d] = v.availability as Availability;
        }
      }
      setVotes(map);
    }
  });

  const ranges = allowedRanges.data ?? [];
  const days = ranges.flatMap((r) => eachDay(r.start, r.end));
  const uniqueDays = Array.from(new Set(days)).sort();

  const setDay = (day: string, value: Availability) => {
    setVotes((prev) => ({ ...prev, [day]: value }));
  };

  const onSubmit = async () => {
    if (!pollId) return;
    setSaving(true);
    // Agrupamos días consecutivos con la misma availability en rangos.
    const rangesToSubmit: Vote[] = [];
    let i = 0;
    while (i < uniqueDays.length) {
      const d = uniqueDays[i]!;
      const v = votes[d];
      if (!v) {
        i++;
        continue;
      }
      let j = i;
      while (
        j + 1 < uniqueDays.length &&
        votes[uniqueDays[j + 1]!] === v &&
        consecutiveDays(uniqueDays[j]!, uniqueDays[j + 1]!)
      ) {
        j++;
      }
      rangesToSubmit.push({ start: d, end: uniqueDays[j]!, availability: v });
      i = j + 1;
    }
    const r = await pollsService.submitDateVotes({
      pollId: pollId as never,
      votes: rangesToSubmit,
    });
    setSaving(false);
    if (r.error) {
      Alert.alert('Error', r.error.message);
      return;
    }
    // Recalcular resultados en background.
    pollsService.recomputeDateResults(pollId as never).catch(() => {});
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-base">
      <Stack.Screen options={{ title: 'Votar fechas' }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text className="text-h2 text-neutral-900">Marca tu disponibilidad</Text>
        <Text className="text-body text-neutral-600">
          Selecciona Sí / Prefiero / Tal vez / No para cada día del rango.
        </Text>
        {uniqueDays.map((day) => {
          const current = votes[day] ?? null;
          return (
            <Card key={day} padding="sm">
              <View className="flex-row items-center justify-between">
                <Text className="text-body font-semibold text-neutral-900">
                  {new Date(day).toLocaleDateString('es-ES', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
                <View className="flex-row gap-2">
                  {AVAILABILITIES.map((a) => {
                    const active = current === a.value;
                    return (
                      <Pressable
                        key={a.value}
                        onPress={() => setDay(day, a.value)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={a.label}
                        className={`h-9 w-9 rounded-full items-center justify-center ${
                          active ? a.color : 'bg-neutral-100'
                        }`}
                      >
                        <Text
                          className={`text-caption font-semibold ${
                            active ? 'text-white' : 'text-neutral-600'
                          }`}
                        >
                          {a.label[0]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </Card>
          );
        })}
        <View className="mt-4">
          <Button
            label={saving ? 'Guardando…' : 'Guardar votos'}
            onPress={onSubmit}
            loading={saving}
            fullWidth
            size="lg"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function consecutiveDays(a: string, b: string): boolean {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24) === 1;
}
