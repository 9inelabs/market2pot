import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { LeafMark } from '@/components/brand/LeafMark';
import { AuthStepScreen } from '@/components/layout/AuthStepScreen';
import { AgreementCheckbox } from '@/components/ui/AgreementCheckbox';
import { AvatarPicker } from '@/components/ui/AvatarPicker';
import { BankSummaryCard } from '@/components/ui/BankSummaryCard';
import { Button } from '@/components/ui/Button';
import { strings } from '@/i18n/strings';
import { getInitials } from '@/lib/initials';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type BankSummary = {
  bank_name: string;
  account_number: string;
  resolved_account_name: string;
  verification_status: string;
};

type LocationSummary = {
  address_line: string;
  lga: string | null;
  state: string | null;
};

export default function ReviewProfileScreen() {
  const profile = useAuthStore((state) => state.profile);
  const [bank, setBank] = useState<BankSummary | null>(null);
  const [location, setLocation] = useState<LocationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [copyNote, setCopyNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const [bankResult, locationResult] = await Promise.all([
        supabase
          .from('bank_accounts')
          .select('bank_name, account_number, resolved_account_name, verification_status')
          .eq('profile_id', user.id)
          .maybeSingle(),
        supabase
          .from('farm_locations')
          .select('address_line, lga, state')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      setBank(bankResult.data ?? null);
      setLocation(locationResult.data ?? null);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConfirm = async () => {
    if (!agreed) {
      setError(strings.bankDetailsAgreementRequired);
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
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
        .update({ step: 'complete' })
        .eq('id', user.id);
      if (stepError) {
        setError(stepError.message);
        return;
      }

      await useAuthStore.getState().fetchProfile();
      router.replace('/(app)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // "Axis • Lekki, Lagos" in the design — address_line is the free-text/
  // detected line, lga+state the geocoded pair, matching the farm_locations
  // schema written by farm-location.tsx.
  const locationLine = location
    ? [location.address_line, [location.lga, location.state].filter(Boolean).join(', ')]
        .filter(Boolean)
        .join(' • ')
    : null;

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.harvestGreen} />
      </View>
    );
  }

  return (
    <AuthStepScreen
      headline={strings.reviewHeadline}
      subtitle={strings.reviewSubtitle}
      contentGap={12}
      footer={
        <View style={styles.footerButtons}>
          <Button
            label={strings.reviewConfirm}
            onPress={handleConfirm}
            disabled={submitting}
            loading={submitting}
          />
          <Button
            label={strings.reviewEdit}
            variant="secondary"
            onPress={() => router.back()}
            disabled={submitting}
          />
        </View>
      }
    >
      <View style={styles.body}>
        <View style={styles.profileBlock}>
          <AvatarPicker uri={profile?.avatar_url} initials={getInitials(profile?.full_name)} size={64} />
          <View style={styles.identityGroup}>
            <View style={styles.nameRow}>
              <Text style={typography.button}>{profile?.full_name}</Text>
              <LeafMark width={13} height={14} />
            </View>
            {bank?.verification_status === 'verified' ? (
              <Text style={[typography.caption, styles.verified]}>{strings.reviewVerifiedBadge}</Text>
            ) : null}
            {locationLine ? (
              <Text style={[typography.caption, styles.location]}>{locationLine}</Text>
            ) : null}
          </View>
        </View>

        {bank ? (
          <BankSummaryCard
            accountName={bank.resolved_account_name}
            bankName={bank.bank_name}
            accountNumber={bank.account_number}
            onCopy={() => setCopyNote(true)}
          />
        ) : null}

        {copyNote ? (
          <Text style={[typography.caption, styles.copyNote]}>{strings.reviewCopyAccountNumber}</Text>
        ) : null}

        <Text style={[typography.caption, styles.note]}>{strings.reviewNote}</Text>

        <View style={styles.checkboxWrap}>
          <AgreementCheckbox checked={agreed} onChange={setAgreed} />
        </View>

        {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}
      </View>
    </AuthStepScreen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warmCream,
  },
  body: {
    gap: spacing[16],
  },
  profileBlock: {
    alignItems: 'center',
    gap: spacing[16],
  },
  identityGroup: {
    alignItems: 'center',
    gap: 5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  verified: {
    color: colors.harvestGreen,
  },
  location: {
    color: colors.textMuted,
  },
  copyNote: {
    color: colors.harvestGreen,
    textAlign: 'center',
  },
  note: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  checkboxWrap: {
    marginTop: spacing[24],
  },
  error: {
    color: colors.danger,
  },
  footerButtons: {
    gap: spacing[12],
  },
});
