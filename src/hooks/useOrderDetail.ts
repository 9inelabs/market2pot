import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { nextFarmerStatus, type FulfillmentType, type OrderStatus } from '@/lib/orderStatus';
import { useAuthStore } from '@/store/useAuthStore';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];

export type OrderDetail = Order & {
  householdName: string;
  householdPhone: string | null;
  farmName: string;
  farmerProfileId: string;
  items: OrderItem[];
  isViewerFarmer: boolean;
  isViewerHousehold: boolean;
};

// Order Detail / Track Order — one order, its items, the customer's
// name/phone, and every action either side can take. Escrow-critical writes
// (advancing to a delivery-confirmation stage, cancelling, releasing funds)
// go through dedicated Edge Functions, never a raw client `.update()` — see
// 20260821090200_orders_escrow.sql for why orders' column grants only allow
// `status` at all, and even that is blocked from ever reaching 'delivered'
// or 'cancelled' directly.
export function useOrderDetail(orderId: string | undefined) {
  const farmerProfileId = useAuthStore((state) => state.farmerProfile?.id);
  const userId = useAuthStore((state) => state.session?.user.id);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orderId) {
      setOrder(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('*, household:profiles(full_name, phone), farmer_profiles(id, farm_name), order_items(*)')
      .eq('id', orderId)
      .single();

    if (fetchError || !data) {
      setError(fetchError?.message ?? 'Order not found');
      setOrder(null);
      setLoading(false);
      return;
    }

    const { household, farmer_profiles, order_items, ...order } = data as typeof data & {
      household: { full_name: string | null; phone: string | null } | null;
      farmer_profiles: { id: string; farm_name: string } | null;
      order_items: OrderItem[];
    };
    setOrder({
      ...order,
      householdName: household?.full_name ?? 'Household',
      householdPhone: household?.phone ?? null,
      farmName: farmer_profiles?.farm_name ?? 'Farm',
      farmerProfileId: farmer_profiles?.id ?? order.farmer_id,
      items: order_items,
      isViewerFarmer: !!farmerProfileId && farmerProfileId === order.farmer_id,
      isViewerHousehold: !!userId && userId === order.household_id,
    });
    setLoading(false);
  }, [orderId, farmerProfileId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Plain stage advance (pending -> preparing -> packaged -> ready/out) —
  // still a direct client write, since it's not escrow-sensitive.
  const advance = async () => {
    if (!order) return;
    const next = nextFarmerStatus(
      order.status as OrderStatus,
      order.fulfillment_type as FulfillmentType | null
    );
    if (!next) return;

    setActionPending(true);
    setError(null);
    const previousStatus = order.status;
    setOrder((current) => (current ? { ...current, status: next } : current));

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: next })
      .eq('id', order.id);

    if (updateError) {
      setOrder((current) => (current ? { ...current, status: previousStatus } : current));
      setError(updateError.message);
    }
    setActionPending(false);
  };

  const invokeAction = async (fn: string) => {
    if (!order) return;
    setActionPending(true);
    setError(null);
    const { error: fnError } = await supabase.functions.invoke(fn, { body: { order_id: order.id } });
    setActionPending(false);
    if (fnError) {
      setError(fnError.message);
      return;
    }
    await load();
  };

  const markDelivered = () => invokeAction('confirm-order-delivered');
  const markReceived = () => invokeAction('confirm-order-received');
  const cancelOrder = () => invokeAction('cancel-order');

  return {
    order,
    loading,
    advancing: actionPending,
    error,
    advance,
    markDelivered,
    markReceived,
    cancelOrder,
    refresh: load,
  };
}
