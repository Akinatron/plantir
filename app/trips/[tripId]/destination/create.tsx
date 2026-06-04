import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../../../src/components/feedback/InlineNotice';
import { AppText } from '../../../../src/components/ui/AppText';
import { Button } from '../../../../src/components/ui/Button';
import { Screen } from '../../../../src/components/ui/Screen';
import { TextField } from '../../../../src/components/ui/TextField';
import { useAuth } from '../../../../src/features/auth/AuthProvider';
import {
  useCreateDestinationProposalMutation,
  useFetchLinkMetadataMutation,
} from '../../../../src/hooks/useDestination';
import {
  DestinationProposalFormValues,
  ParsedDestinationProposalFormValues,
  destinationProposalSchema,
} from '../../../../src/lib/validation/destination';

export default function CreateDestinationProposalScreen() {
  const router = useRouter();
  const { tripId, pollId } = useLocalSearchParams<{ tripId: string; pollId: string }>();
  const { user } = useAuth();
  const createMutation = useCreateDestinationProposalMutation(user?.id);
  const metadataMutation = useFetchLinkMetadataMutation();
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<DestinationProposalFormValues, unknown, ParsedDestinationProposalFormValues>({
    resolver: zodResolver(destinationProposalSchema),
    defaultValues: {
      tripId,
      pollId,
      title: '',
      url: null,
      description: null,
      locationName: null,
      totalPriceCents: null,
      currencyCode: 'EUR',
      pricePerPersonCents: null,
      capacity: null,
      bedrooms: null,
      bathrooms: null,
      pros: '',
      cons: '',
      imageBase64: null,
      imageContentType: null,
      imageFileExtension: null,
    },
  });
  const url = useWatch({ control, name: 'url' });
  const imageBase64 = useWatch({ control, name: 'imageBase64' });

  const onSubmit = handleSubmit(async (values) => {
    const proposal = await createMutation.mutateAsync({
      ...values,
      tripId,
      pollId,
    });
    router.replace(`/trips/${tripId}/destination/${proposal.id}`);
  });

  const fetchMetadata = async () => {
    if (!url) {
      return;
    }

    const metadata = await metadataMutation.mutateAsync(url);

    if (metadata.title) {
      setValue('title', metadata.title, { shouldDirty: true });
    }

    if (metadata.description) {
      setValue('description', metadata.description, { shouldDirty: true });
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      base64: true,
      mediaTypes: ['images'],
      quality: 0.82,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const base64 = asset?.base64;

    if (!asset || !base64) {
      return;
    }

    const fileName = asset.fileName ?? 'proposal.jpg';
    const extension = fileName.includes('.') ? fileName.split('.').pop() ?? 'jpg' : 'jpg';
    setValue('imageBase64', base64, { shouldDirty: true });
    setValue('imageContentType', asset.mimeType ?? 'image/jpeg', { shouldDirty: true });
    setValue('imageFileExtension', extension ?? 'jpg', { shouldDirty: true });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <AppText variant="eyebrow">Proposal</AppText>
          <AppText variant="title">Add accommodation</AppText>
        </View>

        {createMutation.error ? (
          <InlineNotice title="Proposal failed to save" message={createMutation.error.message} tone="error" />
        ) : null}

        {metadataMutation.error ? (
          <InlineNotice title="Metadata fetch failed" message={metadataMutation.error.message} tone="error" />
        ) : null}

        <View style={styles.form}>
          <Controller
            control={control}
            name="url"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="URL"
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={(text) => onChange(text.trim().length > 0 ? text : null)}
                value={value ?? ''}
                error={errors.url?.message}
              />
            )}
          />
          <Button
            label={metadataMutation.isPending ? 'Fetching...' : 'Fetch link metadata'}
            variant="secondary"
            onPress={fetchMetadata}
            disabled={!url || metadataMutation.isPending}
          />
          <Controller
            control={control}
            name="title"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField label="Title" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.title?.message} />
            )}
          />
          <Controller
            control={control}
            name="description"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Description"
                multiline
                onBlur={onBlur}
                onChangeText={(text) => onChange(text.trim().length > 0 ? text : null)}
                value={value ?? ''}
                error={errors.description?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="locationName"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Location name"
                onBlur={onBlur}
                onChangeText={(text) => onChange(text.trim().length > 0 ? text : null)}
                value={value ?? ''}
                error={errors.locationName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="totalPriceCents"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Total price"
                keyboardType="decimal-pad"
                onBlur={onBlur}
                onChangeText={(text) => onChange(text.trim().length > 0 ? text : null)}
                value={value ?? ''}
                error={errors.totalPriceCents?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="pricePerPersonCents"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Price per person"
                keyboardType="decimal-pad"
                onBlur={onBlur}
                onChangeText={(text) => onChange(text.trim().length > 0 ? text : null)}
                value={value ?? ''}
                error={errors.pricePerPersonCents?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="currencyCode"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Currency"
                autoCapitalize="characters"
                onBlur={onBlur}
                onChangeText={(text) => onChange(text.trim().length > 0 ? text : null)}
                value={value ?? ''}
                error={errors.currencyCode?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="capacity"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Capacity"
                keyboardType="number-pad"
                onBlur={onBlur}
                onChangeText={(text) => onChange(text.trim().length > 0 ? text : null)}
                value={value === null ? '' : String(value)}
                error={errors.capacity?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="bedrooms"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Bedrooms"
                keyboardType="decimal-pad"
                onBlur={onBlur}
                onChangeText={(text) => onChange(text.trim().length > 0 ? text : null)}
                value={value === null ? '' : String(value)}
                error={errors.bedrooms?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="bathrooms"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Bathrooms"
                keyboardType="decimal-pad"
                onBlur={onBlur}
                onChangeText={(text) => onChange(text.trim().length > 0 ? text : null)}
                value={value === null ? '' : String(value)}
                error={errors.bathrooms?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="pros"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField label="Pros" multiline onBlur={onBlur} onChangeText={onChange} value={value} />
            )}
          />
          <Controller
            control={control}
            name="cons"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField label="Cons" multiline onBlur={onBlur} onChangeText={onChange} value={value} />
            )}
          />
        </View>

        <Button label={imageBase64 ? 'Image selected' : 'Pick image'} variant="secondary" onPress={pickImage} />
        <Button
          label={createMutation.isPending ? 'Saving...' : 'Save proposal'}
          onPress={onSubmit}
          disabled={!user || createMutation.isPending}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingVertical: 24,
  },
  header: {
    gap: 8,
  },
  form: {
    gap: 14,
  },
});
