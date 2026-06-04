import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';

type PageHeaderProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description?: string;
}>;

export function PageHeader({ eyebrow, title, description, children }: PageHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <AppText variant="eyebrow">{eyebrow}</AppText>
        <AppText variant="title">{title}</AppText>
        {description ? <AppText>{description}</AppText> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 14,
  },
  copy: {
    gap: 8,
  },
});
