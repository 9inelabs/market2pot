// TEMPORARY: proves Reanimated, Supabase, and the phase-1 theme/motion/skeleton
// primitives are wired correctly. This screen will be replaced by the real
// routing gate in phase 5 (build spec section 9).
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LeafMark } from '@/components/brand/LeafMark';
import { Wordmark } from '@/components/brand/Wordmark';
import { Stagger } from '@/components/motion/Stagger';
import { Skeleton } from '@/components/skeleton/Skeleton';
import { useMinimumLoadingDuration } from '@/components/skeleton/useMinimumLoadingDuration';
import { strings } from '@/i18n/strings';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export default function TempIndexScreen() {
  const [status, setStatus] = useState('Checking Supabase connection…');
  const [checkingSession, setCheckingSession] = useState(true);
  const skeletonVisible = useMinimumLoadingDuration(checkingSession);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ error }) => {
        setStatus(error ? error.message : 'Supabase connected');
      })
      .catch((error: Error) => {
        setStatus(error.message);
      })
      .finally(() => setCheckingSession(false));
  }, []);

  return (
    <View style={styles.container}>
      <Stagger initialDelay={80}>
        <LeafMark width={64} height={70} />
        <Wordmark width={160} height={48} />
        <Text style={[typography.h1, styles.title]}>Market2pot</Text>
        <Text style={[typography.body, styles.status]}>{status}</Text>
        <Text style={[typography.label, styles.helper]}>
          {strings.identityFullNameHelper}
        </Text>
        {skeletonVisible ? (
          <Skeleton radius={25} height={70} width={240} />
        ) : (
          <Text style={typography.caption}>Skeleton min-display check passed</Text>
        )}
      </Stagger>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[12],
    backgroundColor: colors.warmCream,
    paddingHorizontal: spacing[24],
  },
  title: {
    color: colors.textPrimary,
  },
  status: {
    color: colors.textMuted,
  },
  helper: {
    color: colors.goldenWheatText,
  },
});
