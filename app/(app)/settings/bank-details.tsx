import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type CurrentBank = {
  bankName: string;
  accountNumber: string;
  resolvedAccountName: string;
};

type Resolution = {
  accountName: string;
  bankName: string;
  matchScore: number;
  matchStatus: NameMatchStatus;
};

// Reuses the exact same auto-resolve/submit-bank-account pattern as the
// signup flow's bank-details.tsx — this is the "reuse whatever
// bank-verification pattern already exists" the app spec asked for.
// submit-bank-account already upserts on profile_id, so re-submitting here
// correctly replaces the existing payout account rather than erroring.
export default function SettingsBankDetailsScreen() {
  const fullName = useAuthStore((state) => state.profile?.full_name);
  const { banks, loading: banksLoading } = useBanks();

  const [current, setCurrent] = useState<CurrentBank | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);

  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from('bank_accounts')
        .select('bank_name, account_number, resolved_account_name')
        .eq('profile_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      setCurrent(
        data
          ? { bankName: data.bank_name, accountNumber: data.account_number, resolvedAccountName: data.resolved_account_name }
          : null
      );
      setLoadingCurrent(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleUpdate = async () => {
    if (!resolution || resolution.matchStatus === 'blocked' || !selectedBank) {
      return;
    }
    if (!agreed) {
      setSubmitError(strings.bankDetailsAgreementRequired);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSaved(false);

    try {
      const { data, error } = await supabase.functions.invoke('submit-bank-account', {
        body: { account_number: accountNumber, bank_code: selectedBank.code },
      });
      if (error || !data) {
        setSubmitError(await extractFunctionErrorMessage(error));
        return;
      }

      setCurrent({
        bankName: resolution.bankName,
        accountNumber,
        resolvedAccountName: resolution.accountName,
      });
      setSelectedBank(null);
      setAccountNumber('');
      setResolution(null);
      setAgreed(false);
      setSaved(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canUpdate = !!resolution && resolution.matchStatus !== 'blocked' && agreed && !submitting;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={styles.topBar}
        accessibilityRole="button"
        accessibilityLabel={strings.back}
      >
        <Text style={styles.backLabel}>‹ {strings.back}</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[typography.button, styles.title]}>{strings.settingsBankDetailsTitle}</Text>

        <Text style={[typography.label, styles.fieldLabel]}>{strings.settingsBankDetailsCurrentLabel}</Text>
        {loadingCurrent ? null : current ? (
          <ResolvedAccountCard
            accountName={current.resolvedAccountName}
            bankName={current.bankName}
            accountNumber={current.accountNumber}
          />
        ) : (
          <Text style={[typography.caption, styles.noneText]}>{strings.settingsBankDetailsNone}</Text>
        )}

        <Text style={[typography.label, styles.fieldLabel]}>{strings.bankDetailsSelectBank}</Text>
        <BankPicker
          banks={banks}
          loading={banksLoading}
          value={selectedBank}
          onChange={(bank) => {
            setSelectedBank(bank);
            setAccountNumber('');
            setSaved(false);
          }}
          placeholder={strings.bankDetailsSelectBank}
        />

        <TextField
          value={accountNumber}
          onChangeText={(text) => setAccountNumber(text.replace(/[^0-9]/g, '').slice(0, 10))}
          placeholder={strings.bankDetailsAccountNumber}
          keyboardType="number-pad"
          maxLength={10}
          style={styles.accountInput}
        />

        {resolving ? (
          <Text style={[typography.caption, styles.hint]}>{strings.bankDetailsResolving}</Text>
        ) : null}
        {resolveError ? <Text style={[typography.caption, styles.error]}>{resolveError}</Text> : null}
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
          <Text style={[typography.caption, styles.error]}>{strings.bankNameMismatch}</Text>
        ) : null}

        {resolution && resolution.matchStatus !== 'blocked' ? (
          <AgreementCheckbox checked={agreed} onChange={setAgreed} />
        ) : null}

        {submitError ? <Text style={[typography.caption, styles.error]}>{submitError}</Text> : null}
        {saved ? <Text style={[typography.caption, styles.saved]}>{strings.editProfileSaved}</Text> : null}

        <Button
          label={strings.settingsBankDetailsUpdate}
          onPress={handleUpdate}
          disabled={!canUpdate}
          loading={submitting}
          style={styles.updateButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  topBar: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[16],
    alignSelf: 'flex-start',
  },
  backLabel: {
    ...typography.label,
    fontSize: 16,
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[12],
    paddingBottom: spacing[40],
  },
  title: {
    color: colors.textPrimary,
  },
  fieldLabel: {
    color: colors.textPrimary,
    marginTop: spacing[16],
    marginBottom: spacing[8],
  },
  noneText: {
    color: colors.textMuted,
  },
  accountInput: {
    marginTop: spacing[8],
  },
  hint: {
    color: colors.textMuted,
    marginTop: spacing[8],
  },
  error: {
    color: colors.danger,
    marginTop: spacing[8],
  },
  review: {
    color: colors.goldenWheatText,
    marginTop: spacing[8],
  },
  saved: {
    color: colors.harvestGreen,
    marginTop: spacing[8],
  },
  updateButton: {
    marginTop: spacing[24],
  },
});
