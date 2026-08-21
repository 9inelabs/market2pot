import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Product } from '@/hooks/useFreshProducts';

export type UpcomingHarvestProduct = Product & { preorderCount: number };

// Home hub's "Upcoming harvest" card — pre-order products with a future
// harvest date, soonest first, each with its own pre-order count. Pre-order
// count comes from order_items whose product_id matches and whose parent
// order hasn't been cancelled — there's no dedicated "preorder" flag on
// orders, so a plain count of items referencing this product is the closest
// real signal until a distinct preorder-order concept exists.
export function useUpcomingHarvest(farmerProfileId: string | undefined) {
  const [products, setProducts] = useState<UpcomingHarvestProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!farmerProfileId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    // NOT set on refetch — see useAutoRefresh. This hook is polled every 20s;
    // flipping loading back to true made every consumer unmount its list and
    // remount it, which is the visible blink/flash the screens had. loading
    // now means "first load hasn't finished", nothing else, so a background
    // refresh swaps the data underneath without the UI ever going empty.
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from('products')
      .select('*, order_items(id)')
      .eq('farmer_id', farmerProfileId)
      .eq('is_preorder', true)
      .gte('harvest_date', today)
      .order('harvest_date', { ascending: true });

    const rows = (data ?? []) as Array<Product & { order_items: { id: string }[] }>;
    setProducts(
      rows.map((row) => ({
        ...row,
        preorderCount: row.order_items?.length ?? 0,
      }))
    );
    setLoading(false);
  }, [farmerProfileId]);

  useEffect(() => {
    load();
  }, [load]);

  return { products, loading, refresh: load };
}
