// Persists a farmer's bank account (build spec section 8.1) — the ONLY
// place bank_accounts is written from the app. bank_accounts_insert_own
// still technically grants INSERT on every column (a gap flagged back in
// 20260814145823_bank_accounts_column_grants.sql: revoking only UPDATE on
// resolved_account_name/name_match_score/verification_status left INSERT
// untouched, since revoking it too would mean the client can't create the
// row at all). This function closes that gap in practice: the app no longer
// calls `.insert()`/`.upsert()` on bank_accounts directly, and this function
// never trusts client-submitted verification fields — it re-resolves via
// Paystack and recomputes the match itself, then writes via the service
// role (ctx.supabaseAdmin), which is also the only way to legally update
// verification_status et al. on a resubmit, since `authenticated`'s UPDATE
// privilege on those columns is deliberately revoked.
//
// Re-resolving here (rather than trusting the account_name the client got
// from resolve-account moments earlier) costs a second Paystack call per
// submission, but it's the only way to guarantee the persisted row reflects
// a real server-side check rather than a value relayed from the client.
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';

import { matchNames } from '../_shared/nameMatch.ts';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const RATE_LIMIT_PER_HOUR = 10;

type SubmitRequestBody = {
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
    const userId = ctx.userClaims.id;

    // Shares the same budget as resolve-account's live preview — both hit
    // Paystack's resolve endpoint, so both should count against it.
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
      (await req.json()) as SubmitRequestBody;

    if (!accountNumber || !/^\d{10}$/.test(accountNumber) || !bankCode) {
      return Response.json(
        { error: 'account_number (10 digits) and bank_code are required' },
        { status: 400 }
      );
    }

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
      console.error('submit-bank-account: fetch to Paystack failed', fetchErr);
      return Response.json({ error: 'Could not reach Paystack. Try again.' }, { status: 502 });
    }

    const rawBody = await paystackResponse.text();
    let paystackBody: PaystackResolveResponse;
    try {
      paystackBody = JSON.parse(rawBody) as PaystackResolveResponse;
    } catch {
      console.error(
        'submit-bank-account: Paystack returned non-JSON',
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
        'submit-bank-account: Paystack rejected the resolve request',
        paystackResponse.status,
        paystackBody.message
      );
      return Response.json(
        { error: paystackBody.message ?? 'Could not resolve this account.' },
        { status: 422 }
      );
    }

    const { data: bankRow } = await ctx.supabase
      .from('banks')
      .select('name')
      .eq('code', bankCode)
      .maybeSingle();
    const bankName = bankRow?.name ?? null;

    const { data: profileRow, error: profileError } = await ctx.supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();
    if (profileError || !profileRow?.full_name) {
      return Response.json(
        { error: 'Could not load your profile name to verify against. Try again.' },
        { status: 500 }
      );
    }

    const accountName = paystackBody.data.account_name;
    const { score, status: matchStatus } = matchNames(accountName, profileRow.full_name);

    if (matchStatus === 'blocked') {
      return Response.json(
        {
          error:
            'This account name does not match your profile name closely enough. Check the details or update your name.',
        },
        { status: 422 }
      );
    }

    const { error: upsertError } = await ctx.supabaseAdmin.from('bank_accounts').upsert(
      {
        profile_id: userId,
        bank_code: bankCode,
        bank_name: bankName ?? 'Unknown bank',
        account_number: accountNumber,
        resolved_account_name: accountName,
        name_match_score: score,
        verification_status: matchStatus,
      },
      { onConflict: 'profile_id' }
    );
    if (upsertError) {
      return Response.json({ error: upsertError.message }, { status: 500 });
    }

    return Response.json({
      account_name: accountName,
      bank_name: bankName,
      match_score: score,
      match_status: matchStatus,
    });
  }),
};
