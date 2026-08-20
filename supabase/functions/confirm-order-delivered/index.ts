// The farmer's "Product Delivered" confirmation. Sets farmer_confirmed_at,
// then releases escrow funds if the household had already confirmed too.
// orders.farmer_confirmed_at has no client column grant (see
// 20260821090200_orders_escrow.sql) — this service-role write is the only
// legal path to it, so a farmer can't forge this via a raw client UPDATE.
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';

import { releaseFundsIfBothConfirmed } from '../_shared/escrow.ts';

type RequestBody = { order_id?: string };

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const userId = ctx.userClaims.id;
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      return Response.json({ error: 'PAYSTACK_SECRET_KEY is not configured' }, { status: 500 });
    }

    const { order_id: orderId } = (await req.json()) as RequestBody;
    if (!orderId) {
      return Response.json({ error: 'order_id is required' }, { status: 400 });
    }

    const { data: order, error: orderError } = await ctx.supabaseAdmin
      .from('orders')
      .select('id, status, farmer_id, farmer_confirmed_at, farmer_profiles!inner(profile_id)')
      .eq('id', orderId)
      .single();
    if (orderError || !order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }
    const farmerProfile = order.farmer_profiles as unknown as { profile_id: string };
    if (farmerProfile.profile_id !== userId) {
      return Response.json({ error: 'You are not the farmer on this order' }, { status: 403 });
    }
    if (order.status === 'cancelled') {
      return Response.json({ error: 'This order was cancelled' }, { status: 400 });
    }
    if (order.status !== 'ready_for_pickup' && order.status !== 'out_for_delivery') {
      return Response.json(
        { error: 'Advance the order to Ready for pickup / Out for delivery first' },
        { status: 400 }
      );
    }

    if (!order.farmer_confirmed_at) {
      await ctx.supabaseAdmin
        .from('orders')
        .update({ farmer_confirmed_at: new Date().toISOString() })
        .eq('id', orderId)
        .is('farmer_confirmed_at', null);
    }

    const { released } = await releaseFundsIfBothConfirmed(ctx.supabaseAdmin, paystackSecretKey, orderId);

    if (!released) {
      const { data: fullOrder } = await ctx.supabaseAdmin
        .from('orders')
        .select('household_id')
        .eq('id', orderId)
        .single();
      if (fullOrder) {
        await ctx.supabaseAdmin.from('notifications').insert({
          profile_id: fullOrder.household_id,
          type: 'delivery_confirmed_pending_other_side',
          title: 'The farmer marked your order delivered',
          body: 'Confirm you received it in Track Order to release payment.',
          related_id: orderId,
        });
      }
    }

    return Response.json({ released });
  }),
};
