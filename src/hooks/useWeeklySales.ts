import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type DaySales = { label: string; total: number };

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Insights & Growth's weekly sales bar chart — this farmer's completed
// (delivered) orders, aggregated by calendar day, for the trailing 7 days
// (today inclusive), oldest first so the bars read left-to-right.
export function useWeeklySales(farmerProfileId: string | undefined) {
  const [days, setDays] = useState<DaySales[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!farmerProfileId) {
      setDays([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);

    const { data } = await supabase
      .from('orders')
      .select('total, created_at')
      .eq('farmer_id', farmerProfileId)
      .eq('status', 'delivered')
      .gte('created_at', start.toISOString());

    const totals = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      totals.set(d.toISOString().slice(0, 10), 0);
    }
    for (const order of data ?? []) {
      const key = order.created_at.slice(0, 10);
      if (totals.has(key)) {
        totals.set(key, (totals.get(key) ?? 0) + Number(order.total));
      }
    }

    setDays(
      Array.from(totals.entries()).map(([key, total]) => ({
        label: DAY_LABELS[new Date(`${key}T00:00:00`).getDay()],
        total,
      }))
    );
    setLoading(false);
  }, [farmerProfileId]);

  useEffect(() => {
    load();
  }, [load]);

  return { days, loading, refresh: load };
}
