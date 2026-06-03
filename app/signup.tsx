import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { InlineNotice } from '../src/components/feedback/InlineNotice';
import { AppText } from '../src/components/ui/AppText';
import { Button } from '../src/components/ui/Button';
import { Screen } from '../src/components/ui/Screen';
import { TextField } from '../src/components/ui/TextField';
import { useAuth } from '../src/features/auth/AuthProvider';
import { useSignupMutation } from '../src/hooks/useAuthMutations';
import { SignupFormValues, signupSchema } from '../src/lib/validation/auth';

export default function SignupScreen() {
  const router = useRouter();
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
    router.replace('/(tabs)/trips');
  });

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.keyboard}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <AppText variant="eyebrow">New account</AppText>
            <AppText variant="title">Create your profile</AppText>
            <AppText>Set up the account foundation before creating trips.</AppText>
          </View>

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

          <Button
            label="Create account"
            onPress={onSubmit}
            disabled={!isConfigured || signupMutation.isPending}
          />

          <Link href="/login" style={styles.link}>
            Already have an account?
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
  link: {
    color: '#0F6B57',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
