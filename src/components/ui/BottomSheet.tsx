import { PropsWithChildren, ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';
import { shadows } from '../../design/shadows';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

type BottomSheetProps = PropsWithChildren<{
  visible: boolean;
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  onClose: () => void;
}>;

export function BottomSheet({ visible, title, subtitle, footer, onClose, children }: BottomSheetProps) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Close sheet" style={StyleSheet.absoluteFill} onPress={onClose} />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.handle} />
          {(title || subtitle) && (
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                {title ? <AppText variant="subtitle">{title}</AppText> : null}
                {subtitle ? <AppText variant="body">{subtitle}</AppText> : null}
              </View>
              <IconButton label="Close" icon={<X color={colors.text} size={20} />} onPress={onClose} variant="ghost" />
            </View>
          )}
          <View style={styles.content}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '88%',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
    ...shadows.lg,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.borderStrong,
    borderRadius: radius.full,
    height: 4,
    marginBottom: spacing[4],
    width: 44,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
    paddingBottom: spacing[4],
  },
  headerCopy: {
    flex: 1,
    gap: spacing[1],
  },
  content: {
    gap: spacing[4],
    paddingBottom: spacing[5],
  },
  footer: {
    borderColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: spacing[3],
    paddingTop: spacing[3],
  },
});
