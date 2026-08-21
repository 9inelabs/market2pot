import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Product } from '@/hooks/useFreshProducts';

// Home hub's low-stock banner and Listings' low-stock filter — real query
// against products where quantity_available <= low_stock_threshold. A
// product with no threshold set is never flagged (null <= anything is
// null/false in Postgres, so the query already excludes it naturally).
export function useLowStockProducts(farmerProfileId: string | undefined) {
  const [products, setProducts] = useState<Product[]>([]);
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
    // low_stock_products is a view (quantity_available <= low_stock_threshold
    // can't be expressed as a PostgREST column-to-column filter directly).
    const { data } = await supabase
      .from('low_stock_products')
      .select('*')
      .eq('farmer_id', farmerProfileId);
    setProducts((data as Product[] | null) ?? []);
    setLoading(false);
  }, [farmerProfileId]);

  useEffect(() => {
    load();
  }, [load]);

  return { products, loading, refresh: load };
}
