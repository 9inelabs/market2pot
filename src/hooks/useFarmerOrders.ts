import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

export type Order = Database['public']['Tables']['orders']['Row'];

// Recent orders preview on Farmer Home, and the future Orders tab's farmer
// view. Real query — empty until order creation exists (next phase).
export function useFarmerOrders(farmerProfileId: string | undefined, limit = 4) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!farmerProfileId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('farmer_id', farmerProfileId)
      .order('created_at', { ascending: false })
      .limit(limit);
    setOrders(data ?? []);
    setLoading(false);
  }, [farmerProfileId, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { orders, loading, refresh: load };
}
