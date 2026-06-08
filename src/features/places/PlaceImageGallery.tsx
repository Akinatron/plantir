import { Image, StyleSheet, View } from 'react-native';
import { ImageIcon } from 'lucide-react-native';

import { AppText } from '../../components/ui/AppText';
import { colors } from '../../design/theme';
import { radius, spacing } from '../../design/spacing';

type PlaceImage = {
  signedUrl?: string | null;
  altText?: string | null;
};

type PlaceImageGalleryProps = {
  images?: PlaceImage[];
  title: string;
  previewUri?: string | null;
  compact?: boolean;
};

export function PlaceImageGallery({ images = [], title, previewUri, compact = false }: PlaceImageGalleryProps) {
  const primaryUri = previewUri ?? images.find((image) => image.signedUrl)?.signedUrl ?? null;

  return (
    <View style={[styles.frame, compact && styles.compactFrame]}>
      {primaryUri ? (
        <Image
          accessibilityLabel={images[0]?.altText ?? `${title} photo`}
          resizeMode="cover"
          source={{ uri: primaryUri }}
          style={styles.image}
        />
      ) : (
        <View style={styles.placeholder}>
          <View style={styles.placeholderBadge}>
            <ImageIcon color={colors.primary} size={compact ? 22 : 28} />
          </View>
          {!compact ? (
            <AppText variant="bodyStrong" numberOfLines={1} style={styles.placeholderTitle}>
              {title}
            </AppText>
          ) : null}
          {!compact ? (
            <AppText variant="caption" style={styles.placeholderText}>
              Add photos to make this place easier to compare.
            </AppText>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.surfaceSky,
    borderRadius: radius.lg,
    overflow: 'hidden',
    width: '100%',
  },
  compactFrame: {
    aspectRatio: 16 / 9,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  placeholder: {
    alignItems: 'center',
    flex: 1,
    gap: spacing[2],
    justifyContent: 'center',
    padding: spacing[3],
  },
  placeholderBadge: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  placeholderTitle: {
    maxWidth: '80%',
    textAlign: 'center',
  },
  placeholderText: {
    textAlign: 'center',
  },
});
