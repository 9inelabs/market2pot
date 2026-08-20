import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type BestSeller = { productName: string; unitsSold: number };

// Insights & Growth's "Best sellers" — total units sold in the last 30
// days, across this farmer's delivered orders. order_items snapshots the
// product name at order time, so this reads correctly even if a product is
// later renamed or deleted.
export function useBestSellers(farmerProfileId: string | undefined, limit = 5) {
  const [items, setItems] = useState<BestSeller[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!farmerProfileId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const { data } = await supabase
      .from('orders')
      .select('id, order_items(product_name_snapshot, quantity)')
      .eq('farmer_id', farmerProfileId)
      .eq('status', 'delivered')
      .gte('created_at', since.toISOString());

    const totals = new Map<string, number>();
    for (const order of data ?? []) {
      for (const item of order.order_items ?? []) {
        totals.set(
          item.product_name_snapshot,
          (totals.get(item.product_name_snapshot) ?? 0) + Number(item.quantity)
        );
      }
    }

    setItems(
      Array.from(totals.entries())
        .map(([productName, unitsSold]) => ({ productName, unitsSold }))
        .sort((a, b) => b.unitsSold - a.unitsSold)
        .slice(0, limit)
    );
    setLoading(false);
  }, [farmerProfileId, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, refresh: load };
}
