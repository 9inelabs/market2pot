import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

// The verified-farmer badge — reads the `farmer_verification` view (a
// restricted projection over bank_accounts, see
// 20260817162000_farmer_verification_view.sql), same source review-
// profile.tsx and the household-facing Farmer Profile screen already trust.
export function useFarmerVerification(profileId: string | undefined) {
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) {
      setIsVerified(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from('farmer_verification')
      .select('is_verified')
      .eq('profile_id', profileId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setIsVerified(data?.is_verified ?? false);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  return { isVerified, loading };
}
