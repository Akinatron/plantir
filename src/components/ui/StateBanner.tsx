import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { CircleAlert, CircleCheck, EyeOff, Info, Lock } from 'lucide-react-native';

import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';
import { AppText } from './AppText';

type StateBannerTone = 'info' | 'success' | 'warning' | 'danger' | 'locked' | 'hidden';

type StateBannerProps = {
  title: string;
  message?: string;
  tone?: StateBannerTone;
  icon?: ReactNode;
};

export function StateBanner({ title, message, tone = 'info', icon }: StateBannerProps) {
  return (
    <View
      style={[styles.container, styles[tone]]}
      accessibilityRole={tone === 'danger' ? 'alert' : 'summary'}
      accessibilityLiveRegion={tone === 'danger' ? 'assertive' : 'polite'}
      accessible
    >
      <View style={styles.iconWrap}>{icon ?? defaultIcon(tone)}</View>
      <View style={styles.copy}>
        <AppText variant="bodyStrong">{title}</AppText>
        {message ? <AppText variant="caption">{message}</AppText> : null}
      </View>
    </View>
  );
}

function defaultIcon(tone: StateBannerTone) {
  if (tone === 'success') {
    return <CircleCheck color={colors.success} size={20} />;
  }

  if (tone === 'danger' || tone === 'warning') {
    return <CircleAlert color={tone === 'danger' ? colors.danger : colors.warning} size={20} />;
  }

  if (tone === 'locked') {
    return <Lock color={colors.textMuted} size={20} />;
  }

  if (tone === 'hidden') {
    return <EyeOff color={colors.info} size={20} />;
  }

  return <Info color={colors.info} size={20} />;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[4],
  },
  iconWrap: {
    paddingTop: spacing[1],
  },
  copy: {
    flex: 1,
    gap: spacing[1],
  },
  info: {
    backgroundColor: colors.infoSoft,
    borderColor: colors.skySoft,
  },
  success: {
    backgroundColor: colors.successSoft,
    borderColor: colors.primarySoft,
  },
  warning: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.sunSoft,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.coralSoft,
  },
  locked: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.borderStrong,
  },
  hidden: {
    backgroundColor: colors.infoSoft,
    borderColor: colors.skySoft,
  },
});
