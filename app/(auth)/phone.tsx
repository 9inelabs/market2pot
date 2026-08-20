import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text } from 'react-native';
import { z } from 'zod';

import { AuthStepScreen } from '@/components/layout/AuthStepScreen';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PhoneField } from '@/components/ui/PhoneField';
import { useCooldown } from '@/hooks/useCooldown';
import { strings } from '@/i18n/strings';
import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type UserRole = Database['public']['Enums']['user_role'];
type Mode = 'signup' | 'reset';

const schema = z.object({
  nationalNumber: z.string().refine(
    (value) => {
      const parsed = parsePhoneNumberFromString(value, 'NG');
      return !!parsed && parsed.isValid();
    },
    { message: strings.phoneInvalid }
  ),
});

type FormValues = z.infer<typeof schema>;

export default function PhoneScreen() {
  const { mode: modeParam, role } = useLocalSearchParams<{ mode?: string; role?: UserRole }>();
  const mode: Mode = modeParam === 'reset' ? 'reset' : 'signup';
  const isSignup = mode === 'signup';
  const cooldown = useCooldown(60);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [existingAccountDialogVisible, setExistingAccountDialogVisible] = useState(false);
  const [pendingE164, setPendingE164] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { nationalNumber: '' },
  });

  const sendOtp = async (e164: string) => {
    setSending(true);
    setSendError(null);

    try {
      // Abuse protection gap: captcha isn't wired up (no site key
      // configured yet — see phase 4 report) and the cooldown below is a
      // client-side UX safeguard, not the "max 5 sends per number per
      // hour, enforced server-side" control the spec calls for. That
      // needs an Edge Function or Supabase's dashboard-level SMS rate
      // limits, neither set up yet.
      const { error } = await supabase.auth.signInWithOtp({
        phone: e164,
        options: { shouldCreateUser: isSignup },
      });

      if (error) {
        if (__DEV__) {
          console.warn('[phone] signInWithOtp error:', error.message);
        }
        const message = error.message.toLowerCase();
        if (message.includes('rate limit')) {
          setSendError(strings.phoneRateLimited);
        } else if (message === 'unsupported phone provider') {
          setSendError(strings.phoneNoSmsProvider);
        } else if (!isSignup && message.includes('user not found')) {
          setSendError(strings.forgotPasswordNoAccount);
        } else {
          setSendError(error.message);
        }
        return;
      }

      cooldown.start();
      router.push({
        pathname: '/(auth)/verify',
        params: { mode, role, phone: e164 },
      });
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSending(false);
    }
  };

  const onSubmit = async ({ nationalNumber }: FormValues) => {
    if (cooldown.isActive || sending) {
      return;
    }

    const parsed = parsePhoneNumberFromString(nationalNumber, 'NG');
    if (!parsed) {
      return;
    }
    const e164 = parsed.number;

    if (!isSignup) {
      await sendOtp(e164);
      return;
    }

    // Existing-account detection — before ever sending an OTP, check
    // whether this phone already belongs to a *completed* account. An
    // interrupted signup (profile exists but step isn't 'complete') isn't
    // flagged here — it just proceeds and resumes naturally once verified,
    // since Supabase won't create a second account for the same phone
    // number either way.
    setSending(true);
    setSendError(null);
    try {
      const { data, error } = await supabase.functions.invoke<{ status: 'new' | 'incomplete' | 'complete' }>(
        'check-phone-status',
        { body: { phone: e164 } }
      );
      if (!error && data?.status === 'complete') {
        setSending(false);
        setPendingE164(e164);
        setExistingAccountDialogVisible(true);
        return;
      }
    } catch {
      // A failed status check shouldn't block signup outright — worst case
      // is the existing-account prompt just doesn't show and the user
      // finds out via Supabase's own OTP flow instead.
    }
    setSending(false);
    await sendOtp(e164);
  };

  return (
    <AuthStepScreen
      headline={isSignup ? strings.phoneHeadline : strings.forgotPasswordHeadline}
      subtitle={isSignup ? strings.phoneSubtitle : strings.forgotPasswordSubtitle}
      footer={
        <Button
          label={
            cooldown.isActive
              ? strings.resendCountdown(cooldown.remainingSeconds)
              : strings.phoneSendCode
          }
          onPress={handleSubmit(onSubmit)}
          disabled={sending || cooldown.isActive}
          loading={sending}
        />
      }
    >
      <Controller
        control={control}
        name="nationalNumber"
        render={({ field: { onChange, onBlur, value } }) => (
          <PhoneField value={value} onChangeText={onChange} onBlur={onBlur} autoFocus />
        )}
      />
      {errors.nationalNumber ? (
        <Text style={[typography.caption, styles.error]}>{errors.nationalNumber.message}</Text>
      ) : sendError ? (
        <Text style={[typography.caption, styles.error]}>{sendError}</Text>
      ) : (
        <Text style={[typography.caption, styles.hint]}>{strings.phonePlaceholder}</Text>
      )}

      <ConfirmDialog
        visible={existingAccountDialogVisible}
        icon="user-check"
        title={strings.phoneExistingAccountTitle}
        message={strings.phoneExistingAccountMessage}
        confirmLabel={strings.phoneExistingAccountConfirm}
        cancelLabel={strings.settingsCancelAction}
        onConfirm={() => {
          setExistingAccountDialogVisible(false);
          router.replace({ pathname: '/(auth)/login', params: { phone: pendingE164 ?? undefined } });
        }}
        onCancel={() => setExistingAccountDialogVisible(false)}
      />
    </AuthStepScreen>
  );
}

const styles = {
  error: {
    color: colors.danger,
  },
  hint: {
    color: colors.textMuted,
  },
} as const;
