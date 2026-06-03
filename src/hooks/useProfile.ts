import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { profileSchema, ProfileFormValues } from '../lib/validation/profile';
import { getProfile, updateProfile, uploadAvatar } from '../services/profileService';

export const profileQueryKey = (userId: string | null | undefined) => ['profile', userId] as const;

export function useProfileQuery(userId: string | null | undefined) {
  return useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: () => {
      if (!userId) {
        throw new Error('Cannot load profile without a user id.');
      }

      return getProfile(userId);
    },
    enabled: Boolean(userId),
  });
}

export function useUpdateProfileMutation(userId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ProfileFormValues) => {
      if (!userId) {
        throw new Error('Cannot update profile without a user id.');
      }

      const parsed = profileSchema.parse(values);
      return updateProfile(userId, parsed);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKey(profile.id), profile);
    },
  });
}

export function useUploadAvatarMutation(userId: string | null | undefined) {
  return useMutation({
    mutationFn: (input: { base64: string; contentType: string; fileExtension: string }) => {
      if (!userId) {
        throw new Error('Cannot upload avatar without a user id.');
      }

      return uploadAvatar({ userId, ...input });
    },
  });
}
