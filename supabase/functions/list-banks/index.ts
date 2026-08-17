// Refreshes the public `banks` cache from Paystack (spec section 8.2).
// Public, user-independent maintenance operation — not tied to any caller
// identity, invoked by the daily pg_cron job (see
// supabase/migrations/*_banks_table.sql) and safe to call more than that.
// Client code never calls this directly; it reads the `banks` table.
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

type PaystackBank = {
  code: string;
  name: string;
};

export default {
  fetch: withSupabase({ auth: 'none' }, async (_req, ctx) => {
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      return Response.json({ error: 'PAYSTACK_SECRET_KEY is not configured' }, { status: 500 });
    }

    const paystackResponse = await fetch(`${PAYSTACK_BASE_URL}/bank?country=nigeria&currency=NGN`, {
      headers: { Authorization: `Bearer ${paystackSecretKey}` },
    });

    if (!paystackResponse.ok) {
      return Response.json({ error: 'Failed to fetch bank list from Paystack' }, { status: 502 });
    }

    const body = (await paystackResponse.json()) as { status: boolean; data: PaystackBank[] };
    if (!body.status) {
      return Response.json({ error: 'Paystack returned an unsuccessful response' }, { status: 502 });
    }

    // Paystack's bank list contains duplicate `code` entries (e.g. the same
    // bank listed once per product/channel variant) — a batch upsert with
    // onConflict:'code' fails outright if the same target row appears twice
    // in one statement, so de-duplicate first (last entry per code wins).
    const byCode = new Map<string, PaystackBank>();
    for (const bank of body.data) {
      byCode.set(bank.code, bank);
    }

    const rows = Array.from(byCode.values()).map((bank) => ({
      code: bank.code,
      name: bank.name,
      updated_at: new Date().toISOString(),
    }));

    // ctx.supabaseAdmin bypasses RLS — required, since `banks` has no
    // insert/update policy for anyone but the service role.
    const { error } = await ctx.supabaseAdmin.from('banks').upsert(rows, { onConflict: 'code' });
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ count: rows.length });
  }),
};
