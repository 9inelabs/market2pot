import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type FarmerPromotion = {
  id: string;
  productId: string;
  productName: string;
  discountPercent: number;
  endsAt: string;
};

// Insights & Growth's "Active promotions" card — this farmer's currently
// active, not-yet-expired promotions, newest first.
export function useFarmerPromotions(farmerProfileId: string | undefined) {
  const [promotions, setPromotions] = useState<FarmerPromotion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!farmerProfileId) {
      setPromotions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('promotions')
      .select('id, product_id, discount_percent, ends_at, products!inner(name, farmer_id)')
      .eq('is_active', true)
      .eq('products.farmer_id', farmerProfileId)
      .gt('ends_at', new Date().toISOString())
      .order('ends_at', { ascending: true });

    setPromotions(
      (data ?? []).map((row) => {
        const product = row.products as unknown as { name: string };
        return {
          id: row.id,
          productId: row.product_id,
          productName: product.name,
          discountPercent: row.discount_percent,
          endsAt: row.ends_at,
        };
      })
    );
    setLoading(false);
  }, [farmerProfileId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (productId: string, discountPercent: number, endsAt: Date) => {
    const { error } = await supabase.from('promotions').insert({
      product_id: productId,
      discount_percent: discountPercent,
      ends_at: endsAt.toISOString(),
      is_active: true,
    });
    if (error) return error.message;
    await load();
    return null;
  };

  return { promotions, loading, refresh: load, create };
}
