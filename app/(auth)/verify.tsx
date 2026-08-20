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
type Mode = 'signup' | 'reset';

const OTP_LENGTH = 6;
const DEV_BYPASS_CODE = '000000';

function maskPhone(phone: string): string {
  return `${phone.slice(0, 4)} *** ${phone.slice(-4)}`;
}

export default function VerifyScreen() {
  const { mode: modeParam, role, phone } = useLocalSearchParams<{
    mode?: string;
    role?: UserRole;
    phone: string;
  }>();
  const mode: Mode = modeParam === 'reset' ? 'reset' : 'signup';
  const isSignup = mode === 'signup';
  const cooldown = useCooldown(60);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signup only: assigns the role chosen pre-auth (role.tsx) and moves the
  // step machine to 'password_pending' — the new first stop after
  // verification, before any of the rest of onboarding. Returns the route
  // to send the user to next rather than assuming set-password, because a
  // phone that turns out to already belong to a *completed* account (the
  // existing-account dialog in phone.tsx was skipped/dismissed, or its
  // check silently failed) must NOT have its role/step overwritten here —
  // that would corrupt a finished account back into onboarding. Throws
  // rather than silently returning on failure — handleComplete's try/catch
  // below is what turns that into a visible error instead of a
  // permanently stuck "verifying" button.
  const resolveRouteAfterVerify = async () => {
    if (!isSignup) {
      return { pathname: '/(profile)/set-password', params: { mode: 'reset' } };
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error(userError?.message ?? 'Your session expired — sign in again.');
    }

    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('step')
      .eq('id', user.id)
      .single();
    if (profileError) {
      throw profileError;
    }

    if (existingProfile.step === 'complete') {
      return { pathname: '/(onboarding)/welcome-back', params: undefined };
    }

    if (role) {
      const { error } = await supabase
        .from('profiles')
        .update({ role, step: 'password_pending', active_view: role === 'farmer' ? 'farmer' : 'household' })
        .eq('id', user.id);
      if (error) {
        throw error;
      }
    }
    return { pathname: '/(profile)/set-password', params: { mode: 'signup' } };
  };

  const handleComplete = async (submittedCode: string) => {
    if (verifying) {
      return;
    }
    setVerifying(true);
    setError(null);

    try {
      if (DEV_OTP_BYPASS && submittedCode === DEV_BYPASS_CODE) {
        const target = await resolveRouteAfterVerify();
        router.replace(target.params ? { pathname: target.pathname, params: target.params } : target.pathname);
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

      const target = await resolveRouteAfterVerify();
      router.replace(target.params ? { pathname: target.pathname, params: target.params } : target.pathname);
    } catch (err) {
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
