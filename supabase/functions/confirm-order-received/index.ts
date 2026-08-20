// The household's "Product Received" confirmation. Mirrors
// confirm-order-delivered — sets household_confirmed_at, then releases
// escrow funds if the farmer had already confirmed too. The app's UI shows
// a warning dialog before ever calling this ("this releases payment to the
// farmer") — this function is the actual point of no return, not the
// client-side confirmation alone.
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
      .select('id, status, household_id, farmer_id, household_confirmed_at')
      .eq('id', orderId)
      .single();
    if (orderError || !order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.household_id !== userId) {
      return Response.json({ error: 'This is not your order' }, { status: 403 });
    }
    if (order.status === 'cancelled') {
      return Response.json({ error: 'This order was cancelled' }, { status: 400 });
    }
    if (
      order.status !== 'ready_for_pickup' &&
      order.status !== 'out_for_delivery' &&
      order.status !== 'delivered'
    ) {
      return Response.json({ error: 'This order is not out for delivery or ready yet' }, { status: 400 });
    }

    if (!order.household_confirmed_at) {
      await ctx.supabaseAdmin
        .from('orders')
        .update({ household_confirmed_at: new Date().toISOString() })
        .eq('id', orderId)
        .is('household_confirmed_at', null);
    }

    const { released } = await releaseFundsIfBothConfirmed(ctx.supabaseAdmin, paystackSecretKey, orderId);

    if (!released) {
      const { data: farmerProfile } = await ctx.supabaseAdmin
        .from('farmer_profiles')
        .select('profile_id')
        .eq('id', order.farmer_id)
        .single();
      if (farmerProfile) {
        await ctx.supabaseAdmin.from('notifications').insert({
          profile_id: farmerProfile.profile_id,
          type: 'delivery_confirmed_pending_other_side',
          title: 'The household confirmed they received their order',
          body: 'Mark it delivered on your end to release payment.',
          related_id: orderId,
        });
      }
    }

    return Response.json({ released });
  }),
};
