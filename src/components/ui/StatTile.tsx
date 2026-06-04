import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';

type StatTileProps = {
  label: string;
  value: string | number;
};

export function StatTile({ label, value }: StatTileProps) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="title" style={styles.value}>
        {value}
      </AppText>
      <AppText style={styles.label}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAECF0',
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '47%',
    gap: 4,
    minHeight: 86,
    padding: 14,
  },
  value: {
    fontSize: 28,
    lineHeight: 34,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
  },
});
