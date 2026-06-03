import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../../src/components/feedback/InlineNotice';
import { LoadingState } from '../../src/components/feedback/LoadingState';
import { PlaceholderState } from '../../src/components/feedback/PlaceholderState';
import { AppText } from '../../src/components/ui/AppText';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { TextField } from '../../src/components/ui/TextField';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { useSignOutMutation } from '../../src/hooks/useAuthMutations';
import {
  useProfileQuery,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
} from '../../src/hooks/useProfile';
import { profileSchema, ProfileFormValues } from '../../src/lib/validation/profile';

export default function ProfileTabScreen() {
  const { user, isLoading: isAuthLoading, error: authError, isConfigured } = useAuth();
  const profileQuery = useProfileQuery(user?.id);
  const updateProfileMutation = useUpdateProfileMutation(user?.id);
  const uploadAvatarMutation = useUploadAvatarMutation(user?.id);
  const signOutMutation = useSignOutMutation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
      avatarUrl: null,
      locale: 'en',
      defaultCurrency: 'EUR',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
  });

  const avatarUrl = useWatch({ control, name: 'avatarUrl' });

  useEffect(() => {
    if (profileQuery.data) {
      reset({
        displayName: profileQuery.data.displayName,
        avatarUrl: profileQuery.data.avatarUrl,
        locale: profileQuery.data.locale,
        defaultCurrency: profileQuery.data.defaultCurrency,
        timezone: profileQuery.data.timezone,
      });
    }
  }, [profileQuery.data, reset]);

  if (isAuthLoading) {
    return (
      <Screen>
        <LoadingState label="Loading session..." />
      </Screen>
    );
  }

  if (!isConfigured) {
    return (
      <Screen>
        <InlineNotice title="Supabase is not configured" message={authError ?? undefined} tone="error" />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen>
        <View style={styles.centered}>
          <PlaceholderState
            title="No profile yet"
            description="Log in or create an account before editing your profile."
          />
          <Link href="/login" asChild>
            <Button label="Log in" />
          </Link>
        </View>
      </Screen>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading profile..." />
      </Screen>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    const profile = await updateProfileMutation.mutateAsync(values);
    reset({
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      locale: profile.locale,
      defaultCurrency: profile.defaultCurrency,
      timezone: profile.timezone,
    });
    setSuccessMessage('Profile updated.');
  });

  const onPickAvatar = async () => {
    setSuccessMessage(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      throw new Error('Photo library permission is required to upload an avatar.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset?.base64) {
      throw new Error('Selected image could not be read.');
    }

    const contentType = asset.mimeType ?? 'image/jpeg';
    const fileExtension = getFileExtension(asset.fileName, contentType);
    const path = await uploadAvatarMutation.mutateAsync({
      base64: asset.base64,
      contentType,
      fileExtension,
    });

    setValue('avatarUrl', path, { shouldDirty: true });
  };

  const isSaving = updateProfileMutation.isPending || uploadAvatarMutation.isPending;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <AppText variant="eyebrow">Profile</AppText>
          <AppText variant="title">Your account</AppText>
          <AppText>Profile preferences will be used as defaults in later trip flows.</AppText>
        </View>

        {profileQuery.error ? (
          <InlineNotice title="Profile failed to load" message={profileQuery.error.message} tone="error" />
        ) : null}

        {updateProfileMutation.error ? (
          <InlineNotice
            title="Profile update failed"
            message={updateProfileMutation.error.message}
            tone="error"
          />
        ) : null}

        {uploadAvatarMutation.error ? (
          <InlineNotice
            title="Avatar upload failed"
            message={uploadAvatarMutation.error.message}
            tone="error"
          />
        ) : null}

        {successMessage ? <InlineNotice title={successMessage} tone="success" /> : null}

        <View style={styles.avatarRow}>
          <View style={styles.avatarPreview}>
            {avatarUrl && isRenderableImageUri(avatarUrl) ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <AppText variant="subtitle">Avatar</AppText>
            )}
          </View>
          <Button
            label={uploadAvatarMutation.isPending ? 'Uploading...' : 'Choose avatar'}
            variant="secondary"
            onPress={onPickAvatar}
            disabled={isSaving}
          />
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="displayName"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Display name"
                autoCapitalize="words"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.displayName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="locale"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Locale"
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.locale?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="defaultCurrency"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Default currency"
                autoCapitalize="characters"
                maxLength={3}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.defaultCurrency?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="timezone"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Timezone"
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.timezone?.message}
              />
            )}
          />
        </View>

        <View style={styles.actions}>
          <Button
            label={updateProfileMutation.isPending ? 'Saving...' : 'Save profile'}
            onPress={onSubmit}
            disabled={isSaving || !isDirty}
          />
          <Button
            label={signOutMutation.isPending ? 'Signing out...' : 'Sign out'}
            variant="secondary"
            onPress={() => signOutMutation.mutate()}
            disabled={signOutMutation.isPending}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function getFileExtension(fileName: string | null | undefined, contentType: string): string {
  if (fileName?.includes('.')) {
    return fileName.split('.').pop() ?? 'jpg';
  }

  if (contentType === 'image/png') {
    return 'png';
  }

  if (contentType === 'image/webp') {
    return 'webp';
  }

  return 'jpg';
}

function isRenderableImageUri(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('file://');
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingVertical: 24,
  },
  centered: {
    flex: 1,
    gap: 20,
  },
  header: {
    gap: 8,
  },
  avatarRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  avatarPreview: {
    alignItems: 'center',
    backgroundColor: '#E7F4EF',
    borderRadius: 8,
    height: 92,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 92,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  form: {
    gap: 16,
  },
  actions: {
    gap: 12,
  },
});
