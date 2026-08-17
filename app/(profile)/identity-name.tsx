import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text } from 'react-native';
import { z } from 'zod';

import { AuthStepScreen } from '@/components/layout/AuthStepScreen';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { TextField } from '@/components/ui/TextField';
import { strings } from '@/i18n/strings';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

// Shared between both roles — identical screen in both design uploads,
// except farmers also get a date-of-birth field (not in either mockup;
// added per the project owner's explicit decision to satisfy the build
// spec's 18+ payout requirement, since farmers reach bank-details later in
// this same flow). Kept as separate state rather than folded into the
// react-hook-form schema — trying to make one zod schema conditionally
// require a field based on role turned into more type-casting than the
// one extra field is worth.
const schema = z.object({
  fullName: z.string().trim().min(2, { message: strings.identityNameRequired }),
});

type FormValues = z.infer<typeof schema>;

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function IdentityNameScreen() {
  const role = useAuthStore((state) => state.profile?.role);
  const isFarmer = role === 'farmer';
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [dobError, setDobError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const maximumDob = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date;
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { fullName: '' },
  });

  const onSubmit = async ({ fullName }: FormValues) => {
    if (isFarmer && !dateOfBirth) {
      setDobError(strings.identityDobRequired);
      return;
    }
    if (isFarmer && dateOfBirth && dateOfBirth > maximumDob) {
      setDobError(strings.identityDobTooYoung);
      return;
    }
    setDobError(null);
    setSubmitting(true);
    setSubmitError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setSubmitError(userError?.message ?? 'Your session expired — sign in again.');
        return;
      }

      const update: { full_name: string; date_of_birth?: string } = { full_name: fullName };
      if (isFarmer && dateOfBirth) {
        update.date_of_birth = toISODate(dateOfBirth);
      }

      // step stays identity_pending — advances to location_pending only
      // once the (optional/skippable) photo step is also done.
      const { error } = await supabase.from('profiles').update(update).eq('id', user.id);
      if (error) {
        setSubmitError(error.message);
        return;
      }

      await useAuthStore.getState().fetchProfile();
      router.push('/(profile)/identity-photo');
    } catch (err) {
      // Without this, any thrown error (network drop, etc.) would leave
      // `submitting` stuck true forever — the button would look disabled
      // and do nothing, with no feedback at all.
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthStepScreen
      headline={strings.identityNameHeadline}
      subtitle={isFarmer ? strings.identityNameSubtitleFarmer : strings.identityNameSubtitle}
      footer={
        <Button
          label={strings.identityNameContinue}
          onPress={handleSubmit(onSubmit)}
          disabled={submitting}
          loading={submitting}
        />
      }
    >
      <Controller
        control={control}
        name="fullName"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={strings.identityNamePlaceholder}
            autoCapitalize="words"
            autoFocus
          />
        )}
      />
      {errors.fullName ? (
        <Text style={[typography.caption, styles.error]}>{errors.fullName.message}</Text>
      ) : null}

      {isFarmer ? (
        <>
          <Text style={[typography.caption, styles.bankNote]}>{strings.identityNameBankNote}</Text>

          <Text style={[typography.label, styles.dobLabel]}>{strings.identityDobLabel}</Text>
          <DateField
            value={dateOfBirth}
            onChange={(date) => {
              setDateOfBirth(date);
              setDobError(null);
            }}
            placeholder={strings.identityDobPlaceholder}
            maximumDate={maximumDob}
          />
          {dobError ? <Text style={[typography.caption, styles.error]}>{dobError}</Text> : null}
        </>
      ) : null}

      {submitError ? <Text style={[typography.caption, styles.error]}>{submitError}</Text> : null}
    </AuthStepScreen>
  );
}

const styles = {
  error: {
    color: colors.danger,
  },
  bankNote: {
    color: colors.textMuted,
    marginTop: spacing[8],
  },
  dobLabel: {
    color: colors.textPrimary,
    marginTop: spacing[16],
  },
} as const;
