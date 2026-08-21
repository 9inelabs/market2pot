import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

export type Product = Database['public']['Tables']['products']['Row'];

// Fresh Picks (Home) and Farmer Profile's listings grid — real available
// products, newest first. `category` narrows the query for category-chip
// filtering; omit it for the unfiltered feed.
export function useFreshProducts(options?: { category?: string | null; farmerId?: string; limit?: number }) {
  const category = options?.category ?? null;
  const farmerId = options?.farmerId;
  const limit = options?.limit ?? 20;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // NOT set on refetch — see useAutoRefresh. This hook is polled every 20s;
    // flipping loading back to true made every consumer unmount its list and
    // remount it, which is the visible blink/flash the screens had. loading
    // now means "first load hasn't finished", nothing else, so a background
    // refresh swaps the data underneath without the UI ever going empty.
    setError(null);

    let query = supabase
      .from('products')
      .select('*')
      .eq('is_available', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('category', category);
    }
    if (farmerId) {
      query = query.eq('farmer_id', farmerId);
    }

    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setProducts(data ?? []);
    }
    setLoading(false);
  }, [category, farmerId, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { products, loading, error, refresh: load };
}
