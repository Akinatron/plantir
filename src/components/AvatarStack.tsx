/**
 * AvatarStack — pila de avatares con overflow.
 */

import { View, Text } from 'react-native';
import { Avatar } from './Avatar';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarStackProps {
  users: Array<{ id: string; name: string; source?: { uri: string } | null }>;
  maxVisible?: number;
  size?: Size;
  testID?: string;
}

const overlapMap: Record<Size, number> = {
  xs: -8,
  sm: -10,
  md: -12,
  lg: -14,
  xl: -16,
};

const fontMap: Record<Size, string> = {
  xs: 'text-caption',
  sm: 'text-caption',
  md: 'text-body-sm',
  lg: 'text-body',
  xl: 'text-body-lg',
};

export function AvatarStack({
  users,
  maxVisible = 4,
  size = 'md',
  testID,
}: AvatarStackProps) {
  const visible = users.slice(0, maxVisible);
  const overflow = users.length - maxVisible;
  const overlap = overlapMap[size];
  const font = fontMap[size];

  return (
    <View
      testID={testID}
      accessibilityLabel={`${users.length} participantes`}
      className="flex-row items-center"
    >
      {visible.map((u, i) => (
        <View
          key={u.id}
          style={{ marginLeft: i === 0 ? 0 : overlap, zIndex: visible.length - i }}
        >
          <Avatar name={u.name} source={u.source} size={size} />
        </View>
      ))}
      {overflow > 0 ? (
        <View
          style={{ marginLeft: overlap }}
          className="rounded-full bg-neutral-200 items-center justify-center"
        >
          <View className={`rounded-full bg-neutral-200 items-center justify-center`}
            style={{ width: size === 'xs' ? 20 : size === 'sm' ? 28 : size === 'md' ? 36 : size === 'lg' ? 48 : 64, height: size === 'xs' ? 20 : size === 'sm' ? 28 : size === 'md' ? 36 : size === 'lg' ? 48 : 64 }}
          >
            <Text className={`font-semibold text-neutral-700 ${font}`}>+{overflow}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
