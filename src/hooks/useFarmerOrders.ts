import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import type { OrderStatus } from '@/lib/orderStatus';

export type Order = Database['public']['Tables']['orders']['Row'];

export type FarmerOrderListItem = Order & {
  householdName: string;
  itemSummary: string;
};

// Recent orders preview on Farmer Home, and the Orders tab's full list.
// Real query — empty until checkout/order-creation exists (see the phase
// report). `status` filters to one value; omit for "All".
export function useFarmerOrders(
  farmerProfileId: string | undefined,
  options?: { status?: OrderStatus; limit?: number }
) {
  const status = options?.status;
  const limit = options?.limit;
  const [orders, setOrders] = useState<FarmerOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!farmerProfileId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    let query = supabase
      .from('orders')
      .select('*, household:profiles(full_name), order_items(product_name_snapshot, quantity)')
      .eq('farmer_id', farmerProfileId)
      .order('created_at', { ascending: false });
    if (status) {
      query = query.eq('status', status);
    }
    if (limit) {
      query = query.limit(limit);
    }

    const { data } = await query;
    setOrders(
      (data ?? []).map((row) => {
        const { household, order_items, ...order } = row as typeof row & {
          household: { full_name: string | null } | null;
          order_items: { product_name_snapshot: string; quantity: number }[];
        };
        const itemSummary =
          order_items.length === 1
            ? `${order_items[0].quantity} × ${order_items[0].product_name_snapshot}`
            : `${order_items.length} items`;
        return { ...order, householdName: household?.full_name ?? 'Household', itemSummary };
      })
    );
    setLoading(false);
  }, [farmerProfileId, status, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { orders, loading, refresh: load };
}
