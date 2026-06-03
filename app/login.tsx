import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../src/components/feedback/InlineNotice';
import { Button } from '../src/components/ui/Button';
import { AppText } from '../src/components/ui/AppText';
import { Screen } from '../src/components/ui/Screen';
import { TextField } from '../src/components/ui/TextField';
import { useAuth } from '../src/features/auth/AuthProvider';
import { useLoginMutation, useMagicLinkMutation } from '../src/hooks/useAuthMutations';
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
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.keyboard}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <AppText variant="eyebrow">Welcome back</AppText>
            <AppText variant="title">Log in to Plantir</AppText>
            <AppText>Continue to your trip workspace.</AppText>
          </View>

          {!isConfigured ? (
            <InlineNotice title="Supabase is not configured" message={authError ?? undefined} tone="error" />
          ) : null}

          {loginMutation.error ? (
            <InlineNotice title="Login failed" message={loginMutation.error.message} tone="error" />
          ) : null}

          {magicLinkMutation.isSuccess ? (
            <InlineNotice
              title="Magic link sent"
              message="Check your email and open the link on this device."
              tone="success"
            />
          ) : null}

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
                />
              )}
            />
          </View>

          <View style={styles.actions}>
            <Button label="Log in" onPress={onSubmit} disabled={!isConfigured || isSubmitting} />
            <Button
              label="Send magic link"
              variant="secondary"
              onPress={onMagicLink}
              disabled={!isConfigured || isSubmitting}
            />
          </View>

          <Link
            href={{ pathname: '/signup', params: params.next ? { next: params.next } : undefined }}
            style={styles.link}
          >
            Create an account
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: 22,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  header: {
    gap: 10,
  },
  form: {
    gap: 16,
  },
  actions: {
    gap: 12,
  },
  link: {
    color: '#0F6B57',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
