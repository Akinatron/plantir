/**
 * Avatar — con iniciales como fallback y badge opcional.
 */

import { View, Text, Image } from 'react-native';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  source?: { uri: string } | null;
  name: string;
  size?: Size;
  testID?: string;
}

const sizeMap: Record<Size, { box: string; text: string }> = {
  xs: { box: 'w-5 h-5', text: 'text-caption' },
  sm: { box: 'w-7 h-7', text: 'text-body-sm' },
  md: { box: 'w-9 h-9', text: 'text-body' },
  lg: { box: 'w-12 h-12', text: 'text-h3' },
  xl: { box: 'w-16 h-16', text: 'text-h2' },
};

function initialsOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function colorSeed(name: string): string {
  // Hash simple para color determinista.
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const palette = ['#F2602D', '#0EAA8A', '#1F6FEB', '#C77A02', '#A5370F', '#7DDBC5'];
  return palette[Math.abs(hash) % palette.length]!;
}

export function Avatar({ source, name, size = 'md', testID }: AvatarProps) {
  const s = sizeMap[size];
  if (source) {
    return (
      <Image
        source={source}
        testID={testID}
        accessibilityLabel={name}
        className={`${s.box} rounded-full`}
      />
    );
  }
  return (
    <View
      testID={testID}
      accessibilityLabel={name}
      className={`${s.box} items-center justify-center rounded-full`}
      style={{ backgroundColor: colorSeed(name) }}
    >
      <Text className={`font-semibold text-white ${s.text}`}>{initialsOf(name)}</Text>
    </View>
  );
}
