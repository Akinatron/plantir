import { PropsWithChildren } from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

type TextVariant = 'title' | 'subtitle' | 'body' | 'eyebrow';

type AppTextProps = PropsWithChildren<
  TextProps & {
    variant?: TextVariant;
  }
>;

export function AppText({ children, variant = 'body', style, ...props }: AppTextProps) {
  return (
    <Text {...props} style={[styles.base, styles[variant], style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: '#101828',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  body: {
    color: '#475467',
    fontSize: 16,
    lineHeight: 24,
  },
  eyebrow: {
    color: '#0F6B57',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
});
