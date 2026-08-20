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
    setLoading(true);
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
