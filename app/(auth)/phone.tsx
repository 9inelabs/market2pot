import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text } from 'react-native';
import { z } from 'zod';

import { AuthStepScreen } from '@/components/layout/AuthStepScreen';
import { Button } from '@/components/ui/Button';
import { PhoneField } from '@/components/ui/PhoneField';
import { useCooldown } from '@/hooks/useCooldown';
import { strings } from '@/i18n/strings';
import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type UserRole = Database['public']['Enums']['user_role'];

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
  const { mode, role } = useLocalSearchParams<{ mode?: string; role?: UserRole }>();
  const isSignup = mode !== 'login';
  const cooldown = useCooldown(60);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { nationalNumber: '' },
  });

  const onSubmit = async ({ nationalNumber }: FormValues) => {
    if (cooldown.isActive || sending) {
      return;
    }

    const parsed = parsePhoneNumberFromString(nationalNumber, 'NG');
    if (!parsed) {
      return;
    }
    const e164 = parsed.number;

    setSending(true);
    setSendError(null);

    try {
      // Abuse protection gap: captcha isn't wired up (no site key
      // configured yet — see phase 4 report) and the cooldown below is a
      // client-side UX safeguard, not the "max 5 sends per number per
      // hour, enforced server-side" control the spec calls for. That
      // needs an Edge Function or Supabase's dashboard-level SMS rate
      // limits, neither set up yet.
      //
      // shouldCreateUser mirrors mode exactly: leaving it default-true on
      // the login path would let a mistyped number silently create an
      // orphan account instead of surfacing "no account found."
      const { error } = await supabase.auth.signInWithOtp({
        phone: e164,
        options: { shouldCreateUser: isSignup },
      });

      if (error) {
        // Log the raw error in dev — the friendly messages below are only
        // for the two specific cases we can name confidently. Anything
        // else falls through to error.message verbatim so it's never
        // silently hidden behind a guess.
        if (__DEV__) {
          console.warn('[phone] signInWithOtp error:', error.message);
        }
        const message = error.message.toLowerCase();
        if (message.includes('rate limit')) {
          setSendError(strings.phoneRateLimited);
        } else if (message === 'unsupported phone provider') {
          // Exact match only — this specific phrase means no phone
          // provider is enabled at all (Authentication → Providers →
          // Phone → toggle on), not just "no test number configured yet."
          setSendError(strings.phoneNoSmsProvider);
        } else {
          setSendError(error.message);
        }
        return;
      }

      cooldown.start();
      router.push({
        pathname: '/(auth)/verify',
        params: { mode: mode ?? 'signup', role, phone: e164 },
      });
    } catch (err) {
      // Without this, a thrown error would leave `sending` stuck true
      // forever — the button would look disabled and do nothing.
      setSendError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthStepScreen
      headline={strings.phoneHeadline}
      subtitle={strings.phoneSubtitle}
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
      {/* Static hint by default, replaced by an error when one exists —
          matches the design's single-line helper slot below the field
          rather than an oversized inline TextInput placeholder. */}
      {errors.nationalNumber ? (
        <Text style={[typography.caption, styles.error]}>{errors.nationalNumber.message}</Text>
      ) : sendError ? (
        <Text style={[typography.caption, styles.error]}>{sendError}</Text>
      ) : (
        <Text style={[typography.caption, styles.hint]}>{strings.phonePlaceholder}</Text>
      )}
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
