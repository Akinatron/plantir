import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { ImagePlus, Wand2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import {
  useCreateDestinationCustomFieldMutation,
  useCreateDestinationProposalMutation,
  useDestinationBundleQuery,
  useDestinationCustomFieldsQuery,
  useFetchLinkMetadataMutation,
} from '../../hooks/useDestination';
import { useTripQuery } from '../../hooks/useTrips';
import {
  DestinationProposalFormValues,
  ParsedDestinationProposalFormValues,
  destinationProposalSchema,
} from '../../lib/validation/destination';
import { colors } from '../../design/theme';
import { spacing } from '../../design/spacing';
import { parseMoneyToCents } from '../../lib/algorithms/money';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Screen } from '../../components/ui/Screen';
import { TextArea } from '../../components/ui/TextArea';
import { TextField } from '../../components/ui/TextField';
import { AppText } from '../../components/ui/AppText';
import { PlaceImageGallery } from './PlaceImageGallery';
import { CustomFieldDraftValue, CustomFieldEditor } from './CustomFieldEditor';

type SuggestPlaceFormProps = {
  tripId: string;
  pollId?: string | null;
};

export function SuggestPlaceForm({ tripId, pollId }: SuggestPlaceFormProps) {
  const { user } = useAuth();
  const bundleQuery = useDestinationBundleQuery(tripId);
  const tripQuery = useTripQuery(tripId);
  const activePollId = pollId ?? bundleQuery.data?.poll?.id ?? null;
  const customFieldsQuery = useDestinationCustomFieldsQuery(tripId, activePollId);
  const createProposalMutation = useCreateDestinationProposalMutation(user?.id);
  const fetchMetadataMutation = useFetchLinkMetadataMutation();
  const createFieldMutation = useCreateDestinationCustomFieldMutation(user?.id, tripId, activePollId);
  const [customValues, setCustomValues] = useState<Record<string, CustomFieldDraftValue>>({});

  const defaultValues = useMemo<DestinationProposalFormValues>(
    () => ({
      tripId,
      pollId: activePollId ?? '',
      title: '',
      url: null,
      description: '',
      locationName: '',
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
      customFieldValues: [],
    }),
    [activePollId, tripId],
  );

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<DestinationProposalFormValues, unknown, ParsedDestinationProposalFormValues>({
    resolver: zodResolver(destinationProposalSchema),
    defaultValues,
    values: defaultValues,
  });

  const [imageBase64, imageContentType, externalUrl, title] = useWatch({
    control,
    name: ['imageBase64', 'imageContentType', 'url', 'title'],
  });
  const previewUri = imageBase64 ? `data:${imageContentType};base64,${imageBase64}` : null;
  const canCreateFields = Boolean(tripQuery.data?.memberCanModifyPlaceFields);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [16, 9],
      base64: true,
      mediaTypes: ['images'],
      quality: 0.78,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    setValue('imageBase64', asset.base64 ?? null, { shouldDirty: true, shouldValidate: true });
    setValue('imageContentType', asset.mimeType ?? 'image/jpeg', { shouldDirty: true, shouldValidate: true });
    setValue('imageFileExtension', guessExtension(asset.fileName, asset.mimeType), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const fetchMetadata = async () => {
    if (!externalUrl) {
      return;
    }

    const metadata = await fetchMetadataMutation.mutateAsync(externalUrl);

    if (metadata.title) {
      setValue('title', metadata.title, { shouldDirty: true, shouldValidate: true });
    }

    if (metadata.description) {
      setValue('description', metadata.description, { shouldDirty: true, shouldValidate: true });
    }

    if (metadata.finalUrl) {
      setValue('url', metadata.finalUrl, { shouldDirty: true, shouldValidate: true });
    }
  };

  const submit = (values: ParsedDestinationProposalFormValues) => {
    const parsedValues: ParsedDestinationProposalFormValues = {
      ...values,
      pollId: activePollId ?? values.pollId,
      customFieldValues: buildCustomFieldValues(customValues),
      pricePerPersonCents: null,
      pros: [],
      cons: [],
    };

    createProposalMutation.mutate(parsedValues, {
      onSuccess: (proposal) => {
        router.replace(`/trips/${tripId}/destination/${proposal.id}`);
      },
    });
  };

  if (bundleQuery.isLoading || tripQuery.isLoading) {
    return <LoadingState label="Loading place form..." />;
  }

  if (!activePollId) {
    return <ErrorState title="No place vote" message="Start a destination poll before adding proposals." />;
  }

  return (
    <Screen scroll>
      <PageHeader
        eyebrow="Proposal"
        title="Suggest a place"
        description="Add the listing and the facts the group needs to compare it quickly."
      />

      {createProposalMutation.isError ? (
        <ErrorState title="Place failed to save" message={createProposalMutation.error.message} />
      ) : null}

      <View style={styles.form}>
        <Controller
          control={control}
          name="title"
          render={({ field }) => (
            <TextField
              label="Place name"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.title?.message}
              placeholder="Casa Sol, Villa Mar, Beach apartment..."
            />
          )}
        />

        <Controller
          control={control}
          name="url"
          render={({ field }) => (
            <TextField
              label="External link"
              value={field.value ?? ''}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.url?.message}
              placeholder="booking.com/..."
              keyboardType="url"
              autoCapitalize="none"
            />
          )}
        />

        <Button
          label="Fetch link metadata"
          variant="secondary"
          loading={fetchMetadataMutation.isPending}
          onPress={() => void fetchMetadata()}
          leftIcon={<Wand2 color={colors.primary} size={18} />}
        />

        <Controller
          control={control}
          name="locationName"
          render={({ field }) => (
            <TextField
              label="Location"
              value={field.value ?? ''}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.locationName?.message}
              placeholder="Town, neighborhood, or area"
            />
          )}
        />

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Controller
              control={control}
              name="totalPriceCents"
              render={({ field }) => (
                <TextField
                  label="Total price"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.totalPriceCents?.message}
                  keyboardType="decimal-pad"
                  placeholder="1200"
                />
              )}
            />
          </View>
          <View style={styles.currencyItem}>
            <Controller
              control={control}
              name="currencyCode"
              render={({ field }) => (
                <TextField
                  label="Currency"
                  value={field.value ?? ''}
                  onChangeText={(value) => field.onChange(value.toUpperCase())}
                  onBlur={field.onBlur}
                  error={errors.currencyCode?.message}
                  autoCapitalize="characters"
                  maxLength={3}
                />
              )}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Controller
              control={control}
              name="capacity"
              render={({ field }) => (
                <TextField
                  label="Capacity"
                  value={field.value === null ? '' : String(field.value)}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.capacity?.message}
                  keyboardType="number-pad"
                />
              )}
            />
          </View>
          <View style={styles.rowItem}>
            <Controller
              control={control}
              name="bedrooms"
              render={({ field }) => (
                <TextField
                  label="Bedrooms"
                  value={field.value === null ? '' : String(field.value)}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.bedrooms?.message}
                  keyboardType="decimal-pad"
                />
              )}
            />
          </View>
          <View style={styles.rowItem}>
            <Controller
              control={control}
              name="bathrooms"
              render={({ field }) => (
                <TextField
                  label="Bathrooms"
                  value={field.value === null ? '' : String(field.value)}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.bathrooms?.message}
                  keyboardType="decimal-pad"
                />
              )}
            />
          </View>
        </View>

        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <TextArea
              label="Description"
              value={field.value ?? ''}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.description?.message}
              placeholder="Optional notes about the place."
            />
          )}
        />

        <View style={styles.imageBlock}>
          <AppText variant="eyebrow">Main photo</AppText>
          <PlaceImageGallery title={title || 'Place photo'} previewUri={previewUri} />
          <Button
            label={previewUri ? 'Change photo' : 'Pick image'}
            variant="secondary"
            onPress={() => void pickImage()}
            leftIcon={<ImagePlus color={colors.primary} size={18} />}
          />
        </View>

        <CustomFieldEditor
          fields={customFieldsQuery.data ?? []}
          values={customValues}
          canCreateFields={canCreateFields}
          creatingField={createFieldMutation.isPending}
          onValueChange={(fieldId, value) => setCustomValues((current) => ({ ...current, [fieldId]: value }))}
          onCreateField={(field) => {
            createFieldMutation.mutate({
              tripId,
              pollId: activePollId,
              name: field.name,
              emoji: field.emoji,
              fieldType: field.fieldType,
              showOnCard: field.showOnCard,
              required: false,
              sortOrder: customFieldsQuery.data?.length ?? 0,
            });
          }}
        />

        {createFieldMutation.isError ? (
          <AppText variant="caption" style={styles.errorText}>
            {createFieldMutation.error.message}
          </AppText>
        ) : null}

        <Button
          label="Save place"
          loading={createProposalMutation.isPending}
          onPress={handleSubmit(submit)}
        />
      </View>
    </Screen>
  );
}

function buildCustomFieldValues(values: Record<string, CustomFieldDraftValue>) {
  return Object.entries(values)
    .map(([fieldId, value]) => ({
      fieldId,
      valueText: value.valueText?.trim() || null,
      valueNumber: parseOptionalNumber(value.valueNumber),
      valueMoneyCents: parseOptionalMoney(value.valueMoneyCents),
      valueBoolean: value.valueBoolean ?? null,
      valueUrl: normalizeOptionalUrl(value.valueUrl),
    }))
    .filter(
      (value) =>
        value.valueText !== null ||
        value.valueNumber !== null ||
        value.valueMoneyCents !== null ||
        value.valueBoolean !== null ||
        value.valueUrl !== null,
    );
}

function parseOptionalNumber(value?: string | null): number | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalMoney(value?: string | null): number | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return parseMoneyToCents(trimmed);
}

function normalizeOptionalUrl(value?: string | null): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function guessExtension(fileName?: string | null, mimeType?: string | null): string {
  const extension = fileName?.split('.').pop();

  if (extension) {
    return extension;
  }

  if (mimeType === 'image/png') {
    return 'png';
  }

  if (mimeType === 'image/webp') {
    return 'webp';
  }

  return 'jpg';
}

const styles = StyleSheet.create({
  form: {
    gap: spacing[4],
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  rowItem: {
    flexBasis: 160,
    flexGrow: 1,
  },
  currencyItem: {
    flexBasis: 120,
    flexGrow: 0.4,
  },
  imageBlock: {
    gap: spacing[3],
  },
  errorText: {
    color: colors.danger,
  },
});
