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
    setLoading(true);
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

// Distinct categories among currently-available products, for the
// category-chip row. Fetched separately (not derived from useFreshProducts'
// own limited/filtered result) so the chip list doesn't shrink to whatever
// happens to be in the current feed.
export function useProductCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('products')
      .select('category')
      .eq('is_available', true)
      .then(({ data }) => {
        if (cancelled) return;
        const unique = Array.from(new Set((data ?? []).map((row) => row.category)));
        setCategories(unique);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, loading };
}
