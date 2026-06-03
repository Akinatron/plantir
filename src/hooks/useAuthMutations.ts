import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  sendMagicLink,
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from '../services/authService';

export function useLoginMutation() {
  return useMutation({ mutationFn: signInWithPassword });
}

export function useSignupMutation() {
  return useMutation({ mutationFn: signUpWithPassword });
}

export function useMagicLinkMutation() {
  return useMutation({ mutationFn: sendMagicLink });
}

export function useSignOutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
