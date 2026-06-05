import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../src/components/feedback/InlineNotice';
import { AppText } from '../src/components/ui/AppText';
import { Button } from '../src/components/ui/Button';
import { Screen } from '../src/components/ui/Screen';
import { TextField } from '../src/components/ui/TextField';
import { AuthPanel } from '../src/features/auth/AuthPanel';
import { useAuth } from '../src/features/auth/AuthProvider';
import { useLoginMutation, useMagicLinkMutation } from '../src/hooks/useAuthMutations';
import { colors } from '../src/design/theme';
import { spacing } from '../src/design/spacing';
import { typography } from '../src/design/typography';
import { LoginFormValues, loginSchema } from '../src/lib/validation/auth';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const { error: authError, isConfigured } = useAuth();
  const loginMutation = useLoginMutation();
  const magicLinkMutation = useMagicLinkMutation();
  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    await loginMutation.mutateAsync(values);
    router.replace(params.next ?? '/(tabs)/trips');
  });

  const onMagicLink = async () => {
    const email = getValues('email');
    await magicLinkMutation.mutateAsync({ email });
  };

  const isSubmitting = loginMutation.isPending || magicLinkMutation.isPending;

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={styles.keyboard}>
      <Screen scroll centered contentContainerStyle={styles.screenContent}>
        <AuthPanel
          eyebrow="Welcome back"
          title="Log in to Plantir"
          description="Open your trip space, check decisions, and keep the group moving."
          footer={
            <Link
              href={{ pathname: '/signup', params: params.next ? { next: params.next } : undefined }}
              style={styles.link}
            >
              Create an account
            </Link>
          }
        >
          <View style={styles.noticeStack}>
            {!isConfigured ? (
              <InlineNotice title="Supabase is not configured" message={authError ?? undefined} tone="error" />
            ) : null}

            {loginMutation.error ? (
              <InlineNotice title="Login failed" message={loginMutation.error.message} tone="error" />
            ) : null}

            {magicLinkMutation.error ? (
              <InlineNotice title="Magic link failed" message={magicLinkMutation.error.message} tone="error" />
            ) : null}

            {magicLinkMutation.isSuccess ? (
              <InlineNotice
                title="Magic link sent"
                message="Check your email and open the link on this device."
                tone="success"
              />
            ) : null}
          </View>

          <View style={styles.form}>
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
                  placeholder="Your password"
                />
              )}
            />
          </View>

          <View style={styles.actions}>
            <Button
              label={loginMutation.isPending ? 'Logging in...' : 'Log in'}
              onPress={onSubmit}
              disabled={!isConfigured || isSubmitting}
            />
            <Button
              label={magicLinkMutation.isPending ? 'Sending...' : 'Send magic link'}
              variant="secondary"
              onPress={onMagicLink}
              disabled={!isConfigured || isSubmitting}
            />
          </View>

          <AppText variant="caption" style={styles.caption}>
            Use email and password for the fastest local testing flow.
          </AppText>
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
  actions: {
    gap: spacing[3],
  },
  link: {
    ...typography.label,
    color: colors.primary,
    textAlign: 'center',
  },
  caption: {
    textAlign: 'center',
  },
});
