import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type NearbyFarmer = {
  id: string;
  profileId: string;
  farmName: string;
  fullName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  locationLine: string | null;
};

// Farmers Near You (Home) / the Farmer Profile screen's list. No real
// distance-based ordering yet — farm_locations.latitude/longitude exist,
// but a household's own delivery_locations coordinates aren't guaranteed
// populated (manual-entry addresses skip reverse geocoding), so this lists
// farmers by newest-first rather than pretending to sort by real distance.
// isVerified is read from the farmer_verification view (see migration
// 20260817162000), never from bank_accounts directly — that table has no
// public-read policy on purpose.
export function useNearbyFarmers() {
  const [farmers, setFarmers] = useState<NearbyFarmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data: farmerProfiles, error: farmerProfilesError } = await supabase
      .from('farmer_profiles')
      .select('id, profile_id, farm_name')
      .order('created_at', { ascending: false })
      .limit(20);

    if (farmerProfilesError) {
      setError(farmerProfilesError.message);
      setLoading(false);
      return;
    }
    if (!farmerProfiles || farmerProfiles.length === 0) {
      setFarmers([]);
      setLoading(false);
      return;
    }

    const profileIds = farmerProfiles.map((f) => f.profile_id);

    const [profilesResult, locationsResult, verificationResult] = await Promise.all([
      supabase.from('profiles').select('id, full_name, avatar_url').in('id', profileIds),
      supabase
        .from('farm_locations')
        .select('profile_id, address_line, lga, state, created_at')
        .in('profile_id', profileIds)
        .order('created_at', { ascending: false }),
      supabase.from('farmer_verification').select('profile_id, is_verified').in('profile_id', profileIds),
    ]);

    const profileById = new Map((profilesResult.data ?? []).map((p) => [p.id, p]));
    const verifiedByProfileId = new Map(
      (verificationResult.data ?? []).map((v) => [v.profile_id, v.is_verified])
    );
    // farm_locations has no unique(profile_id) constraint — keep only the
    // first (most recent, thanks to the ordering above) row per farmer.
    const locationByProfileId = new Map<string, { address_line: string; lga: string | null; state: string | null }>();
    for (const loc of locationsResult.data ?? []) {
      if (!locationByProfileId.has(loc.profile_id)) {
        locationByProfileId.set(loc.profile_id, loc);
      }
    }

    const merged: NearbyFarmer[] = farmerProfiles.map((farmer) => {
      const profile = profileById.get(farmer.profile_id);
      const location = locationByProfileId.get(farmer.profile_id);
      const locationLine = location
        ? [location.address_line, [location.lga, location.state].filter(Boolean).join(', ')]
            .filter(Boolean)
            .join(' • ')
        : null;

      return {
        id: farmer.id,
        profileId: farmer.profile_id,
        farmName: farmer.farm_name,
        fullName: profile?.full_name ?? farmer.farm_name,
        avatarUrl: profile?.avatar_url ?? null,
        isVerified: verifiedByProfileId.get(farmer.profile_id) ?? false,
        locationLine,
      };
    });

    setFarmers(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { farmers, loading, error, refresh: load };
}
