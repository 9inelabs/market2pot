import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export type VerificationStep = {
  key: string;
  label: string;
  complete: boolean;
};

// Business Settings' "Verification progress" — computed from real signals,
// not a stored flag: a bank account on file, at least one farm photo, at
// least one active listing, and a verified phone. "Phone verified" has no
// dedicated column in this schema — signup itself is phone/OTP-gated for
// every farmer, so a non-null profiles.phone is the real signal that the
// number was confirmed at signup, not a placeholder.
export function useVerificationProgress() {
  const profile = useAuthStore((state) => state.profile);
  const farmerProfile = useAuthStore((state) => state.farmerProfile);
  const [steps, setSteps] = useState<VerificationStep[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!farmerProfile) {
      setSteps([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [bankResult, listingsResult] = await Promise.all([
      supabase
        .from('bank_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', farmerProfile.profile_id),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('farmer_id', farmerProfile.id)
        .eq('is_available', true),
    ]);

    setSteps([
      { key: 'bank', label: 'Bank account on file', complete: (bankResult.count ?? 0) > 0 },
      { key: 'photo', label: 'Farm photo added', complete: !!farmerProfile.photo_url },
      {
        key: 'listing',
        label: 'At least one active listing',
        complete: (listingsResult.count ?? 0) > 0,
      },
      { key: 'phone', label: 'Phone number verified', complete: !!profile?.phone },
    ]);
    setLoading(false);
  }, [farmerProfile, profile?.phone]);

  useEffect(() => {
    load();
  }, [load]);

  const completeCount = steps.filter((s) => s.complete).length;

  return { steps, completeCount, total: steps.length, loading, refresh: load };
}
