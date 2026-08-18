import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { AuthStepScreen } from '@/components/layout/AuthStepScreen';
import { AgreementCheckbox } from '@/components/ui/AgreementCheckbox';
import { BankPicker } from '@/components/ui/BankPicker';
import { Button } from '@/components/ui/Button';
import { ResolvedAccountCard } from '@/components/ui/ResolvedAccountCard';
import { TextField } from '@/components/ui/TextField';
import { type Bank, useBanks } from '@/hooks/useBanks';
import { strings } from '@/i18n/strings';
import { extractFunctionErrorMessage } from '@/lib/functionError';
import { matchNames, type NameMatchStatus } from '@/lib/nameMatch';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useRegisterFarmerStore } from '@/store/useRegisterFarmerStore';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Resolution = {
  accountName: string;
  bankName: string;
  matchScore: number;
  matchStatus: NameMatchStatus;
};

// Reuses the same auto-resolve/name-match/submit-bank-account pattern as
// the original signup flow's bank-details.tsx. The only real difference is
// what happens after a successful submit: this flow creates the
// farmer_profiles row (using farm-details.tsx's farmName/bio, held in
// useRegisterFarmerStore) and flips active_view, rather than advancing the
// original signup's onboarding_step.
export default function RegisterFarmerBankDetailsScreen() {
  const fullName = useAuthStore((state) => state.profile?.full_name);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const { farmName, bio, reset } = useRegisterFarmerStore();
  const { banks, loading: banksLoading } = useBanks();

  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // A user who reaches this screen without having gone through
  // farm-details.tsx first (e.g. deep-linked, or backed out and re-entered
  // oddly) has no farmName yet — send them back to the start of this wizard
  // rather than letting them create a farmer_profiles row with an empty
  // required field.
  useEffect(() => {
    if (!farmName.trim()) {
      router.replace('/(app)/register-farmer/farm-details');
    }
  }, [farmName]);

  useEffect(() => {
    setResolution(null);
    setResolveError(null);

    if (!selectedBank || accountNumber.length !== 10) {
      return;
    }

    let cancelled = false;
    setResolving(true);

    supabase.functions
      .invoke<{ account_name: string; bank_name: string | null }>('resolve-account', {
        body: { account_number: accountNumber, bank_code: selectedBank.code },
      })
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setResolveError(await extractFunctionErrorMessage(error));
          return;
        }
        const { score, status } = matchNames(data.account_name, fullName ?? '');
        setResolution({
          accountName: data.account_name,
          bankName: data.bank_name ?? selectedBank.name,
          matchScore: score,
          matchStatus: status,
        });
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedBank, accountNumber, fullName]);

  const handleContinue = async () => {
    if (!resolution || resolution.matchStatus === 'blocked' || !selectedBank) {
      return;
    }
    if (!agreed) {
      setSubmitError(strings.bankDetailsAgreementRequired);
      return;
    }

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

      const { data: submitData, error: submitFnError } = await supabase.functions.invoke(
        'submit-bank-account',
        { body: { account_number: accountNumber, bank_code: selectedBank.code } }
      );
      if (submitFnError || !submitData) {
        setSubmitError(await extractFunctionErrorMessage(submitFnError));
        return;
      }

      const { error: farmerProfileError } = await supabase.from('farmer_profiles').insert({
        profile_id: user.id,
        farm_name: farmName.trim(),
        bio: bio.trim() || null,
      });
      if (farmerProfileError) {
        setSubmitError(farmerProfileError.message);
        return;
      }

      const { error: viewError } = await supabase
        .from('profiles')
        .update({ active_view: 'farmer' })
        .eq('id', user.id);
      if (viewError) {
        setSubmitError(viewError.message);
        return;
      }

      reset();
      await fetchProfile();
      router.replace('/(app)/(tabs)');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canContinue =
    !!resolution && resolution.matchStatus !== 'blocked' && agreed && !submitting;

  return (
    <AuthStepScreen
      headline={strings.bankDetailsHeadline}
      subtitle={strings.bankDetailsSubtitle}
      footer={
        <Button
          label={strings.bankDetailsContinue}
          onPress={handleContinue}
          disabled={!canContinue}
          loading={submitting}
        />
      }
    >
      <BankPicker
        banks={banks}
        loading={banksLoading}
        value={selectedBank}
        onChange={(bank) => {
          setSelectedBank(bank);
          setAccountNumber('');
        }}
        placeholder={strings.bankDetailsSelectBank}
      />

      <TextField
        value={accountNumber}
        onChangeText={(text) => setAccountNumber(text.replace(/[^0-9]/g, '').slice(0, 10))}
        placeholder={strings.bankDetailsAccountNumber}
        keyboardType="number-pad"
        maxLength={10}
      />

      {resolving ? (
        <Text style={[typography.caption, styles.hint]}>{strings.bankDetailsResolving}</Text>
      ) : null}

      {resolveError ? (
        <Text style={[typography.caption, styles.error]}>{resolveError}</Text>
      ) : null}

      {resolution && resolution.matchStatus !== 'blocked' ? (
        <ResolvedAccountCard
          accountName={resolution.accountName}
          bankName={resolution.bankName}
          accountNumber={accountNumber}
        />
      ) : null}

      {resolution?.matchStatus === 'review' ? (
        <Text style={[typography.caption, styles.review]}>{strings.bankNameReview}</Text>
      ) : null}

      {resolution?.matchStatus === 'blocked' ? (
        <View style={styles.mismatchBlock}>
          <Text style={[typography.caption, styles.error]}>{strings.bankNameMismatch}</Text>
          <Button
            label={strings.bankNameMismatchRetryAction}
            variant="secondary"
            onPress={() => {
              setAccountNumber('');
              setResolution(null);
            }}
          />
        </View>
      ) : null}

      <Text style={[typography.caption, styles.encrypted]}>{strings.bankDetailsEncryptedNote}</Text>

      <AgreementCheckbox checked={agreed} onChange={setAgreed} />

      {submitError ? <Text style={[typography.caption, styles.error]}>{submitError}</Text> : null}
    </AuthStepScreen>
  );
}

const styles = {
  hint: {
    color: colors.textMuted,
  },
  error: {
    color: colors.danger,
  },
  review: {
    color: colors.goldenWheatText,
  },
  encrypted: {
    color: colors.textMuted,
    textAlign: 'center' as const,
  },
  mismatchBlock: {
    gap: spacing[12],
  },
};
