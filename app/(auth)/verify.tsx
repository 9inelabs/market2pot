import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthStepScreen } from '@/components/layout/AuthStepScreen';
import { Button } from '@/components/ui/Button';
import { OtpInput } from '@/components/ui/OtpInput';
import { DEV_OTP_BYPASS } from '@/config/features';
import { useCooldown } from '@/hooks/useCooldown';
import { strings } from '@/i18n/strings';
import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type UserRole = Database['public']['Enums']['user_role'];

const OTP_LENGTH = 6;
const DEV_BYPASS_CODE = '000000';

function maskPhone(phone: string): string {
  return `${phone.slice(0, 4)} *** ${phone.slice(-4)}`;
}

export default function VerifyScreen() {
  const { mode, role, phone } = useLocalSearchParams<{
    mode?: string;
    role?: UserRole;
    phone: string;
  }>();
  const isSignup = mode !== 'login';
  const cooldown = useCooldown(60);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Throws rather than silently returning on failure — handleComplete's
  // try/catch below is what turns that into a visible error instead of a
  // permanently stuck "verifying" button.
  const applyRoleAndAdvance = async () => {
    if (!isSignup || !role) {
      return;
    }
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error(userError?.message ?? 'Your session expired — sign in again.');
    }
    const { error } = await supabase
      .from('profiles')
      .update({ role, step: 'identity_pending' })
      .eq('id', user.id);
    if (error) {
      throw error;
    }
  };

  const routeAfterSuccess = () => {
    // Both roles land on the same shared identity-name screen next — it
    // reads role from the auth store itself to decide what to show
    // (farmers get a DOB field) and where to go after (farm-location vs.
    // consumer-location, several steps later).
    if (isSignup && (role === 'farmer' || role === 'consumer')) {
      router.replace('/(profile)/identity-name');
    } else {
      router.replace('/(app)');
    }
  };

  const handleComplete = async (submittedCode: string) => {
    if (verifying) {
      return;
    }
    setVerifying(true);
    setError(null);

    try {
      if (DEV_OTP_BYPASS && submittedCode === DEV_BYPASS_CODE) {
        // Dev-only path — no network call, gated on __DEV__ (see
        // src/config/features.ts) so this can never be reached in a
        // release build regardless of how EXPO_PUBLIC_SMS_ENABLED is set.
        await applyRoleAndAdvance();
        routeAfterSuccess();
        return;
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone,
        token: submittedCode,
        type: 'sms',
      });

      if (verifyError) {
        const message = verifyError.message.toLowerCase();
        setError(message.includes('expired') ? strings.verifyExpired : strings.verifyIncorrect);
        setCode('');
        return;
      }

      await applyRoleAndAdvance();
      routeAfterSuccess();
    } catch (err) {
      // Without this, applyRoleAndAdvance throwing would leave `verifying`
      // stuck true forever — the button would look disabled and do
      // nothing, with no feedback at all (this is the bug that made the
      // consumer-identity screen's Continue button appear dead).
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown.isActive) {
      return;
    }
    setError(null);
    const { error: resendError } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: isSignup },
    });
    if (resendError) {
      if (__DEV__) {
        console.warn('[verify] resend signInWithOtp error:', resendError.message);
      }
      const message = resendError.message.toLowerCase();
      setError(
        message === 'unsupported phone provider' ? strings.phoneNoSmsProvider : resendError.message
      );
      return;
    }
    cooldown.start();
  };

  return (
    <AuthStepScreen
      headline={strings.verifyHeadline}
      subtitle={`${strings.verifySubtitlePrefix} ${maskPhone(phone)}`}
      footer={
        <Button
          label={strings.verifyButton}
          onPress={() => handleComplete(code)}
          disabled={verifying || code.length !== OTP_LENGTH}
          loading={verifying}
        />
      }
    >
      {DEV_OTP_BYPASS ? (
        <View style={styles.devBanner}>
          <Text style={styles.devBannerText}>
            {strings.devModeBanner} — enter {DEV_BYPASS_CODE}
          </Text>
        </View>
      ) : null}

      <OtpInput length={OTP_LENGTH} value={code} onChange={setCode} onComplete={handleComplete} />

      {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}

      <Pressable onPress={handleResend} disabled={cooldown.isActive}>
        <Text
          style={[
            typography.label,
            styles.resend,
            cooldown.isActive && styles.resendDisabled,
          ]}
        >
          {cooldown.isActive
            ? strings.resendCountdown(cooldown.remainingSeconds)
            : strings.verifyResend}
        </Text>
      </Pressable>
    </AuthStepScreen>
  );
}

const styles = StyleSheet.create({
  devBanner: {
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
  },
  devBannerText: {
    ...typography.caption,
    color: colors.surface,
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
  },
  resend: {
    color: colors.harvestGreen,
    textAlign: 'center',
  },
  resendDisabled: {
    color: colors.textMuted,
  },
});
