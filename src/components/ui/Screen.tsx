import { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../design/theme';
import { layout, spacing } from '../../design/spacing';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  centered?: boolean;
  footer?: ReactNode;
  contentContainerStyle?: ViewStyle;
}>;

export function Screen({ children, scroll = false, centered = false, footer, contentContainerStyle }: ScreenProps) {
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 480 ? layout.mobileScreenPadding : layout.screenPadding;
  const contentStyle = [
    styles.content,
    { paddingHorizontal: horizontalPadding },
    centered && styles.centered,
    contentContainerStyle,
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={contentStyle}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={contentStyle}>{children}</View>
      )}
      {footer ? <View style={[styles.footer, { paddingHorizontal: horizontalPadding }]}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    gap: spacing[5],
    maxWidth: layout.maxContentWidth,
    paddingBottom: spacing[6],
    paddingTop: spacing[5],
    width: '100%',
  },
  centered: {
    justifyContent: 'center',
  },
  footer: {
    alignSelf: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderTopWidth: 1,
    maxWidth: layout.maxContentWidth,
    paddingBottom: spacing[3],
    paddingTop: spacing[3],
    width: '100%',
  },
});
