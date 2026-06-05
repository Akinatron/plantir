import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../src/components/feedback/InlineNotice';
import { Button } from '../src/components/ui/Button';
import { Screen } from '../src/components/ui/Screen';
import { TextField } from '../src/components/ui/TextField';
import { AuthPanel } from '../src/features/auth/AuthPanel';
import { useAuth } from '../src/features/auth/AuthProvider';
import { useSignupMutation } from '../src/hooks/useAuthMutations';
import { colors } from '../src/design/theme';
import { spacing } from '../src/design/spacing';
import { typography } from '../src/design/typography';
import { SignupFormValues, signupSchema } from '../src/lib/validation/auth';

export default function SignupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const { error: authError, isConfigured } = useAuth();
  const signupMutation = useSignupMutation();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    await signupMutation.mutateAsync(values);
    router.replace(params.next ?? '/(tabs)/trips');
  });

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={styles.keyboard}>
      <Screen scroll centered contentContainerStyle={styles.screenContent}>
        <AuthPanel
          eyebrow="New account"
          title="Create your profile"
          description="Set up your account before creating trips and inviting the group."
          footer={
            <Link
              href={{ pathname: '/login', params: params.next ? { next: params.next } : undefined }}
              style={styles.link}
            >
              Already have an account?
            </Link>
          }
        >
          <View style={styles.noticeStack}>
            {!isConfigured ? (
              <InlineNotice title="Supabase is not configured" message={authError ?? undefined} tone="error" />
            ) : null}

            {signupMutation.error ? (
              <InlineNotice title="Signup failed" message={signupMutation.error.message} tone="error" />
            ) : null}

            {signupMutation.isSuccess ? (
              <InlineNotice
                title="Account created"
                message="If email confirmation is enabled, confirm your email before logging in."
                tone="success"
              />
            ) : null}
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
                  placeholder="Your name"
                />
              )}
            />
            <Controller
              control={control}
              name="email"
              render={({ field: { onBlur, onChange, value } }) => (
                <TextField
                  label="Email"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.email?.message}
                  placeholder="you@example.com"
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onBlur, onChange, value } }) => (
                <TextField
                  label="Password"
                  autoCapitalize="none"
                  secureTextEntry
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.password?.message}
                  placeholder="Create a password"
                />
              )}
            />
          </View>

          <Button
            label={signupMutation.isPending ? 'Creating...' : 'Create account'}
            onPress={onSubmit}
            disabled={!isConfigured || signupMutation.isPending}
          />
        </AuthPanel>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  screenContent: {
    justifyContent: 'center',
    paddingVertical: spacing[8],
  },
  noticeStack: {
    gap: spacing[2],
  },
  form: {
    gap: spacing[4],
  },
  link: {
    ...typography.label,
    color: colors.primary,
    textAlign: 'center',
  },
});
