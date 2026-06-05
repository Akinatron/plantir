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
          <ImageIcon color={colors.primary} size={compact ? 22 : 28} />
          {!compact ? (
            <AppText variant="caption" style={styles.placeholderText}>
              Add a photo when you have one
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
    backgroundColor: colors.surfaceSea,
    borderRadius: radius.lg,
    overflow: 'hidden',
    width: '100%',
  },
  compactFrame: {
    aspectRatio: 4 / 3,
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
  placeholderText: {
    textAlign: 'center',
  },
});
