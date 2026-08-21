import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import type { OrderStatus } from '@/lib/orderStatus';

export type Order = Database['public']['Tables']['orders']['Row'];

export type HouseholdOrderListItem = Order & {
  farmName: string;
  itemSummary: string;
};

// Household's own Orders tab — mirrors useFarmerOrders' shape/query pattern
// but scoped to household_id and joined against farmer_profiles instead of
// profiles.
export function useHouseholdOrders(
  householdId: string | undefined,
  options?: { status?: OrderStatus; limit?: number }
) {
  const status = options?.status;
  const limit = options?.limit;
  const [orders, setOrders] = useState<HouseholdOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!householdId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    // NOT set on refetch — see useAutoRefresh. This hook is polled every 20s;
    // flipping loading back to true made every consumer unmount its list and
    // remount it, which is the visible blink/flash the screens had. loading
    // now means "first load hasn't finished", nothing else, so a background
    // refresh swaps the data underneath without the UI ever going empty.

    let query = supabase
      .from('orders')
      .select('*, farmer_profiles(farm_name), order_items(product_name_snapshot, quantity)')
      .eq('household_id', householdId)
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
        const { farmer_profiles, order_items, ...order } = row as typeof row & {
          farmer_profiles: { farm_name: string | null } | null;
          order_items: { product_name_snapshot: string; quantity: number }[];
        };
        const itemSummary =
          order_items.length === 1
            ? `${order_items[0].quantity} × ${order_items[0].product_name_snapshot}`
            : `${order_items.length} items`;
        return { ...order, farmName: farmer_profiles?.farm_name ?? 'Farm', itemSummary };
      })
    );
    setLoading(false);
  }, [householdId, status, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { orders, loading, refresh: load };
}
