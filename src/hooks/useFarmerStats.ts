import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type FarmerStats = {
  activeListings: number;
  pendingOrders: number;
  weekTotal: number;
};

// Farmer Home's three stat cards. All real queries — pendingOrders and
// weekTotal will read as 0 until order creation exists (next phase), which
// is the correct, expected state, not a bug.
export function useFarmerStats(farmerProfileId: string | undefined) {
  const [stats, setStats] = useState<FarmerStats>({
    activeListings: 0,
    pendingOrders: 0,
    weekTotal: 0,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!farmerProfileId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const [listingsResult, pendingOrdersResult, weekOrdersResult] = await Promise.all([
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('farmer_id', farmerProfileId)
        .eq('is_available', true),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('farmer_id', farmerProfileId)
        .eq('status', 'pending'),
      supabase
        .from('orders')
        .select('total')
        .eq('farmer_id', farmerProfileId)
        .gte('created_at', startOfWeek.toISOString()),
    ]);

    setStats({
      activeListings: listingsResult.count ?? 0,
      pendingOrders: pendingOrdersResult.count ?? 0,
      weekTotal: (weekOrdersResult.data ?? []).reduce((sum, order) => sum + Number(order.total), 0),
    });
    setLoading(false);
  }, [farmerProfileId]);

  useEffect(() => {
    load();
  }, [load]);

  return { stats, loading, refresh: load };
}
