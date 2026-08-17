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
import { matchNames, type NameMatchStatus } from '@/lib/nameMatch';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Resolution = {
  accountName: string;
  bankName: string;
  matchScore: number;
  matchStatus: NameMatchStatus;
};

async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  // Duck-typed rather than `instanceof Response` — avoids any possibility of
  // a cross-realm class-identity mismatch between whatever fetch
  // implementation supabase-js resolved to and this file's global
  // `Response` breaking the check silently.
  const context = (error as { context?: unknown } | undefined)?.context as
    | { text?: () => Promise<string>; status?: number }
    | undefined;

  if (context && typeof context.text === 'function') {
    try {
      // Read as text first, then parse — calling `.json()` directly here
      // was observed to fall through to the generic fallback on-device even
      // though the identical code worked in a Node-based reproduction.
      const text = await context.text();
      try {
        const body = JSON.parse(text) as { error?: string };
        if (body.error) return body.error;
      } catch {
        // Not JSON — surface the raw text (truncated) rather than going
        // straight to a generic message, so an unexpected response shape
        // is still diagnosable from what the user sees.
        if (text.trim()) return text.trim().slice(0, 200);
      }
    } catch (readErr) {
      console.error('extractFunctionErrorMessage: could not read response body', readErr);
    }
    if (typeof context.status === 'number') {
      return `Request failed (status ${context.status}). Try again.`;
    }
  }

  return error instanceof Error ? error.message : 'Something went wrong. Try again.';
}

export default function BankDetailsScreen() {
  const fullName = useAuthStore((state) => state.profile?.full_name);
  const { banks, loading: banksLoading } = useBanks();

  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auto-resolve once 10 digits and a bank are both present — build spec
  // section 7.8: "On 10 digits and a bank selected → auto-resolve."
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
      // Writing bank_accounts happens entirely server-side, in
      // submit-bank-account — it re-verifies via Paystack and upserts with
      // the service role, since bank_accounts_update_own's column grants
      // deliberately block the client from writing
      // resolved_account_name/name_match_score/verification_status itself
      // (would let a farmer self-verify). A plain client-side insert also
      // can't be resubmitted at all: bank_accounts has a unique(profile_id)
      // constraint and no delete policy, so a second insert always fails.
      const { data, error } = await supabase.functions.invoke<{
        account_name: string;
        bank_name: string | null;
        match_score: number;
        match_status: NameMatchStatus;
      }>('submit-bank-account', {
        body: { account_number: accountNumber, bank_code: selectedBank.code },
      });
      if (error || !data) {
        setSubmitError(await extractFunctionErrorMessage(error));
        return;
      }

      // step stays bank_pending — review-profile.tsx is the true final
      // gate; it advances to 'complete' on confirm.
      router.push('/(profile)/review-profile');
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
          <View style={styles.mismatchActions}>
            <Button
              label={strings.bankNameMismatchEditAction}
              variant="secondary"
              onPress={() => router.push('/(profile)/identity-name')}
            />
            <Button
              label={strings.bankNameMismatchRetryAction}
              variant="secondary"
              onPress={() => {
                setAccountNumber('');
                setResolution(null);
              }}
            />
          </View>
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
  mismatchActions: {
    flexDirection: 'row' as const,
    gap: spacing[12],
  },
};
