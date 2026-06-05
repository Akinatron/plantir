import { Image, StyleSheet, View } from 'react-native';

import { colors } from '../../design/theme';
import { typography } from '../../design/typography';
import { AppText } from './AppText';

type AvatarSize = 'sm' | 'md' | 'lg';

type AvatarProps = {
  uri?: string | null;
  name?: string | null;
  size?: AvatarSize;
};

const sizeMap = {
  sm: 32,
  md: 44,
  lg: 64,
} as const;

export function Avatar({ uri, name, size = 'md' }: AvatarProps) {
  const dimension = sizeMap[size];
  const initials = getInitials(name);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        accessibilityLabel={name ? `${name} avatar` : 'Avatar'}
        style={[styles.avatar, { height: dimension, width: dimension, borderRadius: dimension / 2 }]}
      />
    );
  }

  return (
    <View
      accessibilityLabel={name ? `${name} avatar` : 'Avatar'}
      style={[styles.fallback, { height: dimension, width: dimension, borderRadius: dimension / 2 }]}
    >
      <AppText style={[styles.initials, size === 'lg' && styles.initialsLarge]}>{initials}</AppText>
    </View>
  );
}

function getInitials(name?: string | null) {
  if (!name) {
    return '?';
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: colors.primarySoft,
  },
  fallback: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderWidth: 1,
    justifyContent: 'center',
  },
  initials: {
    ...typography.label,
    color: colors.primary,
  },
  initialsLarge: {
    fontSize: 20,
    lineHeight: 26,
  },
});
