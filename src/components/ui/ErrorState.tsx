import { CircleAlert } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';
import { Button } from './Button';
import { AppText } from './AppText';

type ErrorStateProps = {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ErrorState({ title, message, actionLabel, onAction }: ErrorStateProps) {
  return (
    <View style={styles.container} accessibilityRole="alert" accessible>
      <View style={styles.iconWrap}>
        <CircleAlert color={colors.danger} size={24} strokeWidth={2.2} />
      </View>
      <View style={styles.copy}>
        <AppText variant="subtitle" style={styles.centered}>
          {title}
        </AppText>
        {message ? (
          <AppText variant="body" style={styles.centered}>
            {message}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" fullWidth={false} /> : null}
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
    backgroundColor: colors.dangerSoft,
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
