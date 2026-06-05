import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';
import { Button } from './Button';
import { AppText } from './AppText';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, icon, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container} accessible accessibilityLabel={[title, description].filter(Boolean).join('. ')}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <View style={styles.copy}>
        <AppText variant="subtitle" style={styles.centered}>
          {title}
        </AppText>
        {description ? (
          <AppText variant="body" style={styles.centered}>
            {description}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} fullWidth={false} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing[4],
    justifyContent: 'center',
    minHeight: 180,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[8],
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSea,
    borderRadius: radius.full,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  copy: {
    gap: spacing[2],
  },
  centered: {
    textAlign: 'center',
  },
});
