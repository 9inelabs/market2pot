// The actual source of truth for payment success — not the WebView's
// client-side callback redirect, which a user could abandon (close the app,
// lose connectivity) before it ever fires. `verify_jwt = false` in
// config.toml: Paystack calls this directly, with no Supabase user session
// at all — auth is the HMAC signature check below, not a JWT.
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';

import { verifyWebhookSignature } from '../_shared/paystack.ts';

type PaystackEvent = {
  event: string;
  data: {
    reference?: string;
    status?: string;
    transfer_code?: string;
  };
};

export default {
  fetch: withSupabase({ auth: 'none' }, async (req, ctx) => {
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      return Response.json({ error: 'PAYSTACK_SECRET_KEY is not configured' }, { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');
    const validSignature = await verifyWebhookSignature(rawBody, signature, paystackSecretKey);
    if (!validSignature) {
      console.error('paystack-webhook: invalid signature');
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let event: PaystackEvent;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (event.event === 'charge.success' && event.data.reference) {
      const { data: order } = await ctx.supabaseAdmin
        .from('orders')
        .select('id, farmer_id, household_id, payment_status')
        .eq('paystack_reference', event.data.reference)
        .maybeSingle();

      // Idempotency: Paystack can retry a webhook delivery — only act the
      // first time this order is seen as pending.
      if (order && order.payment_status === 'pending') {
        await ctx.supabaseAdmin.from('orders').update({ payment_status: 'paid_held' }).eq('id', order.id);

        const { data: farmerProfile } = await ctx.supabaseAdmin
          .from('farmer_profiles')
          .select('profile_id')
          .eq('id', order.farmer_id)
          .single();
        const { data: household } = await ctx.supabaseAdmin
          .from('profiles')
          .select('full_name')
          .eq('id', order.household_id)
          .single();

        if (farmerProfile) {
          await ctx.supabaseAdmin.from('notifications').insert({
            profile_id: farmerProfile.profile_id,
            type: 'order_paid',
            title: `New order from ${household?.full_name ?? 'a household'}`,
            body: 'Payment received and held in escrow — start preparing when ready.',
            related_id: order.id,
          });
        }
      }
    }

    // transfer.success / transfer.failed — keep the payouts/refunds audit
    // rows honest. Best-effort: the disbursing function already set the row
    // to 'pending' with the transfer_code at creation time.
    if ((event.event === 'transfer.success' || event.event === 'transfer.failed') && event.data.transfer_code) {
      const status = event.event === 'transfer.success' ? 'success' : 'failed';
      await ctx.supabaseAdmin
        .from('payouts')
        .update({ status })
        .eq('paystack_transfer_code', event.data.transfer_code);
      await ctx.supabaseAdmin
        .from('refunds')
        .update({ status })
        .eq('paystack_transfer_code', event.data.transfer_code);
    }

    return Response.json({ received: true });
  }),
};
