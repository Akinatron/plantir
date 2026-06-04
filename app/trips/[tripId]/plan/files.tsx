import { useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../../../src/components/feedback/LoadingState';
import { PlaceholderState } from '../../../../src/components/feedback/PlaceholderState';
import { AppText } from '../../../../src/components/ui/AppText';
import { Screen } from '../../../../src/components/ui/Screen';
import { useTripFilesQuery } from '../../../../src/hooks/usePlanning';
import { TripFile } from '../../../../src/types/planning';

export default function FilesScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const filesQuery = useTripFilesQuery(tripId);

  if (filesQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading files..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <AppText variant="eyebrow">Files</AppText>
              <AppText variant="title">Shared files</AppText>
            </View>
            {filesQuery.error ? (
              <InlineNotice title="Files failed to load" message={filesQuery.error.message} tone="error" />
            ) : null}
          </View>
        }
        contentContainerStyle={styles.list}
        data={filesQuery.data ?? []}
        keyExtractor={(file) => file.path}
        ListEmptyComponent={
          <PlaceholderState title="No files yet" description="Trip files will appear here after upload support is added." />
        }
        renderItem={({ item }) => <FileCard file={item} />}
      />
    </Screen>
  );
}

function FileCard({ file }: { file: TripFile }) {
  return (
    <View style={styles.card}>
      <AppText variant="subtitle">{file.name}</AppText>
      <AppText>{file.path}</AppText>
      {file.updatedAt ? <AppText>Updated {new Date(file.updatedAt).toLocaleDateString()}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 16,
    paddingTop: 24,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAECF0',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
});
