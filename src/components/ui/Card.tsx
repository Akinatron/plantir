import { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

type CardProps = PropsWithChildren<
  ViewProps & {
    selected?: boolean;
  }
>;

export function Card({ children, selected = false, style, ...props }: CardProps) {
  return (
    <View {...props} style={[styles.card, selected && styles.selected, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAECF0',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  selected: {
    borderColor: '#0F6B57',
  },
});
