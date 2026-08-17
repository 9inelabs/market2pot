// Resolves a bank account number to an account name via Paystack (spec
// section 8.1). auth: 'user' — the platform rejects unauthenticated callers
// before this code runs (verify_jwt = true in supabase/config.toml), and
// ctx.supabase is scoped to the caller via RLS, so rate-limit tracking
// doesn't need service-role access at all.
//
// Rate-limited to 10/hour per user — this endpoint is an
// account-enumeration vector (spec's own words) if left open. Never proxies
// the raw Paystack response; returns only { account_name, bank_name }.
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const RATE_LIMIT_PER_HOUR = 10;

type ResolveRequestBody = {
  account_number?: string;
  bank_code?: string;
};

type PaystackResolveResponse = {
  status: boolean;
  message?: string;
  data?: {
    account_number: string;
    account_name: string;
  };
};

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    // NOTE: this @supabase/server version's normalized claims object has no
    // `.sub` field — the user id lives at `.id`. (`.sub` is the raw JWT
    // claim name; this wrapper renames it.) Confirmed by dumping
    // Object.keys/ctx.userClaims directly against a live deployment after
    // every request was failing with an empty, unhelpful error.
    const userId = ctx.userClaims.id;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await ctx.supabase
      .from('account_resolution_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', userId)
      .gte('created_at', oneHourAgo);

    if (countError) {
      return Response.json({ error: countError.message }, { status: 500 });
    }
    if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return Response.json(
        { error: 'Too many account resolution attempts. Try again later.' },
        { status: 429 }
      );
    }

    const { account_number: accountNumber, bank_code: bankCode } =
      (await req.json()) as ResolveRequestBody;

    if (!accountNumber || !/^\d{10}$/.test(accountNumber) || !bankCode) {
      return Response.json(
        { error: 'account_number (10 digits) and bank_code are required' },
        { status: 400 }
      );
    }

    // Logged before calling out, not after — a request that times out or
    // gets abandoned client-side still counts toward the limit.
    const { error: logError } = await ctx.supabase
      .from('account_resolution_attempts')
      .insert({ profile_id: userId });
    if (logError) {
      return Response.json({ error: logError.message }, { status: 500 });
    }

    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      return Response.json({ error: 'PAYSTACK_SECRET_KEY is not configured' }, { status: 500 });
    }

    let paystackResponse: Response;
    try {
      paystackResponse = await fetch(
        `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
        { headers: { Authorization: `Bearer ${paystackSecretKey}` } }
      );
    } catch (fetchErr) {
      console.error('resolve-account: fetch to Paystack failed', fetchErr);
      return Response.json({ error: 'Could not reach Paystack. Try again.' }, { status: 502 });
    }

    // Read as text first — a non-2xx from Paystack (auth failure, rate
    // limit, maintenance page) isn't guaranteed to be JSON, and
    // Response.json() throwing on that would otherwise bubble up as an
    // opaque, unhelpful error from withSupabase's own catch-all.
    const rawBody = await paystackResponse.text();
    let paystackBody: PaystackResolveResponse;
    try {
      paystackBody = JSON.parse(rawBody) as PaystackResolveResponse;
    } catch {
      console.error(
        'resolve-account: Paystack returned non-JSON',
        paystackResponse.status,
        rawBody.slice(0, 500)
      );
      return Response.json(
        { error: `Paystack error (status ${paystackResponse.status}). Check PAYSTACK_SECRET_KEY.` },
        { status: 502 }
      );
    }

    if (!paystackResponse.ok || !paystackBody.status || !paystackBody.data) {
      console.error(
        'resolve-account: Paystack rejected the resolve request',
        paystackResponse.status,
        paystackBody.message
      );
      return Response.json(
        { error: paystackBody.message ?? 'Could not resolve this account.' },
        { status: 422 }
      );
    }

    // Paystack's resolve response doesn't include a bank name — look it up
    // from our own cache rather than trusting a client-supplied value.
    const { data: bankRow } = await ctx.supabase
      .from('banks')
      .select('name')
      .eq('code', bankCode)
      .maybeSingle();

    return Response.json({
      account_name: paystackBody.data.account_name,
      bank_name: bankRow?.name ?? null,
    });
  }),
};
