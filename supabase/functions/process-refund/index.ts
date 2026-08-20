// Household-triggered once they've submitted bank details (reuses the same
// bank_accounts row/pattern the farmer signup flow already established —
// this table was always profile-scoped, not role-scoped). Only reachable
// while payment_status is 'refund_pending' (set by cancel-order).
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';

import { getOrCreateRecipientCode, sendTransfer } from '../_shared/payoutHelpers.ts';

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
      .select('id, household_id, total, payment_status')
      .eq('id', orderId)
      .single();
    if (orderError || !order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.household_id !== userId) {
      return Response.json({ error: 'This is not your order' }, { status: 403 });
    }
    if (order.payment_status !== 'refund_pending') {
      return Response.json({ error: 'This order is not awaiting a refund' }, { status: 400 });
    }

    let recipientCode: string;
    try {
      recipientCode = await getOrCreateRecipientCode(ctx.supabaseAdmin, paystackSecretKey, userId);
    } catch {
      return Response.json(
        { error: 'Add your bank details first so we know where to send the refund.' },
        { status: 400 }
      );
    }

    // Idempotency: only the caller that actually claims the row (still
    // 'refund_pending' at update time) proceeds to call Paystack.
    const { data: claimed } = await ctx.supabaseAdmin
      .from('orders')
      .update({ payment_status: 'refunded' })
      .eq('id', orderId)
      .eq('payment_status', 'refund_pending')
      .select('id')
      .maybeSingle();
    if (!claimed) {
      return Response.json({ error: 'This refund was already processed.' }, { status: 409 });
    }

    try {
      const { transferCode } = await sendTransfer(paystackSecretKey, {
        recipientCode,
        amount: Number(order.total),
        reason: `Market2pot refund for order ${order.id}`,
        reference: `refund_${order.id}`,
      });
      await ctx.supabaseAdmin.from('refunds').insert({
        order_id: order.id,
        household_id: userId,
        amount: order.total,
        paystack_transfer_code: transferCode,
        status: 'pending',
      });
      await ctx.supabaseAdmin.from('notifications').insert({
        profile_id: userId,
        type: 'refund_completed',
        title: 'Your refund is on its way',
        body: `We've sent your refund for order ${order.id.slice(0, 8)} to your bank account.`,
        related_id: order.id,
      });
    } catch (err) {
      // Roll the claim back so the household (or a retry) can try again —
      // the transfer itself never went out.
      await ctx.supabaseAdmin.from('orders').update({ payment_status: 'refund_pending' }).eq('id', orderId);
      const message = err instanceof Error ? err.message : 'Could not process refund.';
      return Response.json({ error: message }, { status: 502 });
    }

    return Response.json({ success: true });
  }),
};
