// Farmer-only cancellation. A household can never cancel a paid order —
// that's enforced simply by this function only ever checking the caller
// against farmer_profiles, never household_id. If money was already held in
// escrow, flips payment_status to 'refund_pending' and notifies the
// household to submit refund bank details.
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';

type RequestBody = { order_id?: string };

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const userId = ctx.userClaims.id;

    const { order_id: orderId } = (await req.json()) as RequestBody;
    if (!orderId) {
      return Response.json({ error: 'order_id is required' }, { status: 400 });
    }

    const { data: order, error: orderError } = await ctx.supabaseAdmin
      .from('orders')
      .select('id, status, payment_status, household_id, farmer_profiles!inner(profile_id)')
      .eq('id', orderId)
      .single();
    if (orderError || !order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }
    const farmerProfile = order.farmer_profiles as unknown as { profile_id: string };
    if (farmerProfile.profile_id !== userId) {
      return Response.json({ error: 'You are not the farmer on this order' }, { status: 403 });
    }
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return Response.json({ error: 'This order can no longer be cancelled' }, { status: 400 });
    }

    const needsRefund = order.payment_status === 'paid_held';
    await ctx.supabaseAdmin
      .from('orders')
      .update({
        status: 'cancelled',
        payment_status: needsRefund ? 'refund_pending' : order.payment_status,
      })
      .eq('id', orderId);

    if (needsRefund) {
      await ctx.supabaseAdmin.from('notifications').insert({
        profile_id: order.household_id,
        type: 'refund_requested',
        title: 'Your order was cancelled — refund available',
        body: 'Add your bank details to receive a refund for this order.',
        related_id: order.id,
      });
    } else {
      await ctx.supabaseAdmin.from('notifications').insert({
        profile_id: order.household_id,
        type: 'order_cancelled',
        title: 'Your order was cancelled',
        body: '',
        related_id: order.id,
      });
    }

    return Response.json({ needs_refund: needsRefund });
  }),
};
