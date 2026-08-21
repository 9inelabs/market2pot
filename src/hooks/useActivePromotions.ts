import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

// Maps productId -> discount_percent, for every currently-active,
// not-yet-expired promotion belonging to this farmer's products. Listings
// uses this to show a "20% OFF" tag; Insights & Growth's "Active
// promotions" card reads the same underlying rows via useFarmerPromotions.
export function useActivePromotions(farmerProfileId: string | undefined) {
  const [byProductId, setByProductId] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!farmerProfileId) {
      setByProductId({});
      setLoading(false);
      return;
    }
    // NOT set on refetch — see useAutoRefresh. This hook is polled every 20s;
    // flipping loading back to true made every consumer unmount its list and
    // remount it, which is the visible blink/flash the screens had. loading
    // now means "first load hasn't finished", nothing else, so a background
    // refresh swaps the data underneath without the UI ever going empty.
    const { data } = await supabase
      .from('promotions')
      .select('product_id, discount_percent, products!inner(farmer_id)')
      .eq('is_active', true)
      .eq('products.farmer_id', farmerProfileId)
      .gt('ends_at', new Date().toISOString());

    const map: Record<string, number> = {};
    for (const row of data ?? []) {
      map[row.product_id] = row.discount_percent;
    }
    setByProductId(map);
    setLoading(false);
  }, [farmerProfileId]);

  useEffect(() => {
    load();
  }, [load]);

  return { byProductId, loading, refresh: load };
}
