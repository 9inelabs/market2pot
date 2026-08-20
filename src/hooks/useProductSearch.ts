import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Product } from '@/hooks/useFreshProducts';

// Search tab — real query against available products, name/category
// case-insensitive substring match. Debounced by the caller (Search screen
// itself), not this hook — keeps the hook a plain "give me a query, get
// results" primitive.
export function useProductSearch(query: string) {
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }
    // PostgREST's .or() takes a mini query-string syntax where `,()` are
    // structural — strip those out of the search term so a term containing
    // one can't break the filter (not a SQL-injection risk either way,
    // PostgREST parameterizes underneath, but an unescaped comma/paren here
    // would silently malform the intended OR condition).
    const safeTerm = trimmed.replace(/[,()]/g, '');
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_available', true)
      .or(`name.ilike.%${safeTerm}%,category.ilike.%${safeTerm}%`)
      .order('created_at', { ascending: false })
      .limit(40);
    setResults(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => search(query), 300);
    return () => clearTimeout(handle);
  }, [query, search]);

  return { results, loading };
}
