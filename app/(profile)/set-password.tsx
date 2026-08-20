import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { AuthStepScreen } from '@/components/layout/AuthStepScreen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { strings } from '@/i18n/strings';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

const MIN_PASSWORD_LENGTH = 8;

type Mode = 'signup' | 'reset';

// Shared between signup (right after phone/OTP verification, before the
// rest of onboarding) and forgot-password (right after re-verifying via
// OTP) — same fields and validation, different copy and post-save action,
// same parameterized-by-mode convention identity-name.tsx already uses for
// role. Either way the account already has a live session at this point
// (from OTP verification), so this is just supabase.auth.updateUser —
// nothing about the password is ever written to `profiles`.
export default function SetPasswordScreen() {
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();
  const mode: Mode = modeParam === 'reset' ? 'reset' : 'signup';
  const isSignup = mode === 'signup';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(strings.setPasswordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(strings.setPasswordMismatch);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }

      if (isSignup) {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          setError(userError?.message ?? 'Your session expired — sign in again.');
          return;
        }
        const { error: stepError } = await supabase
          .from('profiles')
          .update({ step: 'identity_pending' })
          .eq('id', user.id);
        if (stepError) {
          setError(stepError.message);
          return;
        }
        await useAuthStore.getState().fetchProfile();
        router.push('/(profile)/identity-name');
      } else {
        await useAuthStore.getState().fetchProfile();
        router.replace('/(app)');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthStepScreen
      headline={isSignup ? strings.setPasswordHeadlineSignup : strings.setPasswordHeadlineReset}
      subtitle={isSignup ? strings.setPasswordSubtitleSignup : strings.setPasswordSubtitleReset}
      footer={
        <Button
          label={isSignup ? strings.setPasswordContinue : strings.setPasswordSave}
          onPress={onSubmit}
          disabled={submitting}
          loading={submitting}
        />
      }
    >
      <TextField
        value={password}
        onChangeText={setPassword}
        placeholder={strings.setPasswordPlaceholder}
        secureTextEntry
        autoFocus
        style={styles.field}
      />
      <TextField
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder={strings.setPasswordConfirmPlaceholder}
        secureTextEntry
        style={styles.field}
      />

      {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}
    </AuthStepScreen>
  );
}

const styles = {
  field: {
    marginTop: spacing[16],
  },
  error: {
    color: colors.danger,
    marginTop: spacing[16],
  },
} as const;
