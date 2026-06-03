import { StyleSheet, View } from 'react-native';

import { AppText } from '../ui/AppText';

type NoticeTone = 'error' | 'success' | 'info';

type InlineNoticeProps = {
  title: string;
  message?: string;
  tone?: NoticeTone;
};

export function InlineNotice({ title, message, tone = 'info' }: InlineNoticeProps) {
  return (
    <View style={[styles.container, styles[tone]]}>
      <AppText variant="eyebrow" style={styles.title}>
        {title}
      </AppText>
      {message ? <AppText style={styles.message}>{message}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  error: {
    backgroundColor: '#FEF3F2',
    borderColor: '#FDA29B',
  },
  success: {
    backgroundColor: '#ECFDF3',
    borderColor: '#75E0A7',
  },
  info: {
    backgroundColor: '#EFF8FF',
    borderColor: '#84CAFF',
  },
  title: {
    color: '#101828',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
});
