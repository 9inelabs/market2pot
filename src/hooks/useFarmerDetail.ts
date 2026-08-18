import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type FarmerDetail = {
  id: string;
  profileId: string;
  farmName: string;
  bio: string | null;
  fullName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  locationLine: string | null;
};

// The Farmer Profile screen's header/bio data — one farmer_profiles row by
// its own id, joined client-side against profiles/farm_locations/
// farmer_verification the same way useNearbyFarmers merges a whole list.
export function useFarmerDetail(farmerProfileId: string | undefined) {
  const [farmer, setFarmer] = useState<FarmerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!farmerProfileId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const { data: farmerProfile, error: farmerProfileError } = await supabase
      .from('farmer_profiles')
      .select('id, profile_id, farm_name, bio')
      .eq('id', farmerProfileId)
      .maybeSingle();

    if (farmerProfileError) {
      setError(farmerProfileError.message);
      setLoading(false);
      return;
    }
    if (!farmerProfile) {
      setFarmer(null);
      setLoading(false);
      return;
    }

    const [profileResult, locationResult, verificationResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', farmerProfile.profile_id)
        .maybeSingle(),
      supabase
        .from('farm_locations')
        .select('address_line, lga, state')
        .eq('profile_id', farmerProfile.profile_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('farmer_verification')
        .select('is_verified')
        .eq('profile_id', farmerProfile.profile_id)
        .maybeSingle(),
    ]);

    const location = locationResult.data;
    const locationLine = location
      ? [location.address_line, [location.lga, location.state].filter(Boolean).join(', ')]
          .filter(Boolean)
          .join(' • ')
      : null;

    setFarmer({
      id: farmerProfile.id,
      profileId: farmerProfile.profile_id,
      farmName: farmerProfile.farm_name,
      bio: farmerProfile.bio,
      fullName: profileResult.data?.full_name ?? farmerProfile.farm_name,
      avatarUrl: profileResult.data?.avatar_url ?? null,
      isVerified: verificationResult.data?.is_verified ?? false,
      locationLine,
    });
    setLoading(false);
  }, [farmerProfileId]);

  useEffect(() => {
    load();
  }, [load]);

  return { farmer, loading, error, refresh: load };
}
