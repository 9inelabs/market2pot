import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type DeliveryLocation = {
  addressLine: string;
  lga: string | null;
  state: string | null;
};

// The household's own delivery_locations row (set during consumer signup,
// or on a later "change address" flow — not built yet). Home's location
// pill and empty states read from here rather than a separate column, per
// the explicit decision to avoid a second location store.
export function useDeliveryLocation() {
  const [location, setLocation] = useState<DeliveryLocation | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // NOT set on refetch — see useAutoRefresh. This hook is polled every 20s;
    // flipping loading back to true made every consumer unmount its list and
    // remount it, which is the visible blink/flash the screens had. loading
    // now means "first load hasn't finished", nothing else, so a background
    // refresh swaps the data underneath without the UI ever going empty.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('delivery_locations')
      .select('address_line, lga, state')
      .eq('profile_id', user.id)
      .maybeSingle();

    setLocation(
      data ? { addressLine: data.address_line, lga: data.lga, state: data.state } : null
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { location, loading, refresh: load };
}

// "Lekki, Lagos" — the short pill text. Falls back to the free-text address
// line if lga/state weren't captured (manual entry without geocoding).
export function shortLocationLabel(location: DeliveryLocation | null): string | null {
  if (!location) return null;
  const short = [location.lga, location.state].filter(Boolean).join(', ');
  return short || location.addressLine;
}
