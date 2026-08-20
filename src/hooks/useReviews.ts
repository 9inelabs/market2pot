import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

export type Review = Database['public']['Tables']['reviews']['Row'] & {
  reviewerName: string | null;
};

// Insights & Growth's rating summary (average + count + most recent
// comment), and the "View all reviews" full list — both read from the same
// underlying query, just with different limits.
export function useReviews(farmerProfileId: string | undefined, limit?: number) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!farmerProfileId) {
      setReviews([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let query = supabase
      .from('reviews')
      .select('*, household:profiles(full_name)')
      .eq('farmer_id', farmerProfileId)
      .order('created_at', { ascending: false });
    if (limit) {
      query = query.limit(limit);
    }
    const { data } = await query;
    setReviews(
      (data ?? []).map((row) => {
        const { household, ...rest } = row as typeof row & {
          household: { full_name: string | null } | null;
        };
        return { ...rest, reviewerName: household?.full_name ?? null };
      })
    );
    setLoading(false);
  }, [farmerProfileId, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return { reviews, average, count: reviews.length, loading, refresh: load };
}
