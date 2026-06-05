import { StyleSheet, View } from 'react-native';

import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';
import { AppText } from '../ui/AppText';

type NoticeTone = 'error' | 'success' | 'info';

type InlineNoticeProps = {
  title: string;
  message?: string;
  tone?: NoticeTone;
};

export function InlineNotice({ title, message, tone = 'info' }: InlineNoticeProps) {
  return (
    <View
      style={[styles.container, styles[tone]]}
      accessibilityRole={tone === 'error' ? 'alert' : 'summary'}
      accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}
      accessible
    >
      <AppText variant="label" style={styles.title}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="caption" style={styles.message}>
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  error: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.coralSoft,
  },
  success: {
    backgroundColor: colors.successSoft,
    borderColor: colors.primarySoft,
  },
  info: {
    backgroundColor: colors.infoSoft,
    borderColor: colors.skySoft,
  },
  title: {
    color: colors.text,
  },
  message: {
    color: colors.textMuted,
  },
});
