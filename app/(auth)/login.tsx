import { router, useLocalSearchParams } from 'expo-router';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { PhoneField } from '@/components/ui/PhoneField';
import { TextField } from '@/components/ui/TextField';
import { strings } from '@/i18n/strings';
import { resumeRouteForProfile } from '@/lib/authResume';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

// Replaces OTP-based login entirely — phone.tsx's old `mode: 'login'`
// branch is gone, this is the only sign-in path now (forgot-password still
// goes through phone.tsx/verify.tsx with mode="reset", since that
// genuinely needs OTP to prove ownership before a new password).
export default function LoginScreen() {
  const { phone: prefillPhone } = useLocalSearchParams<{ phone?: string }>();
  const [nationalNumber, setNationalNumber] = useState(
    prefillPhone ? prefillPhone.replace('+234', '') : ''
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    const parsed = parsePhoneNumberFromString(nationalNumber, 'NG');
    if (!parsed || !parsed.isValid()) {
      setError(strings.phoneInvalid);
      return;
    }
    if (!password) {
      setError(strings.loginInvalidCredentials);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        phone: parsed.number,
        password,
      });
      if (signInError) {
        setError(strings.loginInvalidCredentials);
        return;
      }

      await useAuthStore.getState().fetchProfile();
      const profile = useAuthStore.getState().profile;
      if (!profile) {
        setError('Something went wrong loading your profile. Try again.');
        return;
      }
      router.replace(resumeRouteForProfile(profile));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={[typography.h1, styles.title]}>{strings.loginHeadline}</Text>
        <Text style={[typography.body, styles.subtitle]}>{strings.loginSubtitle}</Text>

        <View style={styles.phoneField}>
          <PhoneField value={nationalNumber} onChangeText={setNationalNumber} autoFocus={!prefillPhone} />
        </View>

        <TextField
          value={password}
          onChangeText={setPassword}
          placeholder={strings.loginPasswordPlaceholder}
          secureTextEntry
          autoFocus={!!prefillPhone}
          style={styles.passwordField}
        />

        {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}

        <Pressable
          onPress={() => router.push({ pathname: '/(auth)/phone', params: { mode: 'reset' } })}
          hitSlop={8}
          style={styles.forgotLink}
          accessibilityRole="button"
          accessibilityLabel={strings.forgotPasswordLink}
        >
          <Text style={styles.forgotLinkText}>{strings.forgotPasswordLink}</Text>
        </Pressable>

        <Button
          label={strings.loginButton}
          onPress={onSubmit}
          disabled={submitting}
          loading={submitting}
          style={styles.submitButton}
        />

        <View style={styles.signUpRow}>
          <Text style={typography.body}>{strings.loginNoAccount} </Text>
          <Pressable
            onPress={() => router.replace('/(profile)/role')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={strings.loginSignUpLink}
          >
            <Text style={styles.signUpLink}>{strings.loginSignUpLink}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: geometry.screenPaddingButtons,
  },
  title: {
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing[8],
    marginBottom: spacing[32],
  },
  phoneField: {
    marginBottom: spacing[20],
  },
  passwordField: {
    marginBottom: spacing[8],
  },
  error: {
    color: colors.danger,
    marginBottom: spacing[8],
  },
  forgotLink: {
    alignSelf: 'flex-end',
    minHeight: 32,
    justifyContent: 'center',
  },
  forgotLinkText: {
    ...typography.caption,
    color: colors.harvestGreen,
  },
  submitButton: {
    marginTop: spacing[24],
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing[24],
  },
  signUpLink: {
    ...typography.body,
    color: colors.harvestGreen,
    fontWeight: '600',
  },
});
