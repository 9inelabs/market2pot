// Called from phone.tsx (signup mode) before ever sending an OTP — lets the
// app show "an account already exists, sign in instead" without requiring a
// session first (there isn't one yet at this point). `auth: 'none'` for
// that reason, same category as list-banks. Returns only a tri-state
// status, never any actual profile data (name, phone, etc.) — a bare
// existence/completeness signal is the same class of information a
// "forgot password" flow already has to leak by design, but nothing more.
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';

type RequestBody = { phone?: string };
type Status = 'new' | 'incomplete' | 'complete';

export default {
  fetch: withSupabase({ auth: 'none' }, async (req, ctx) => {
    const { phone } = (await req.json()) as RequestBody;
    if (!phone || !/^\+\d{8,15}$/.test(phone)) {
      return Response.json({ error: 'A valid E.164 phone number is required' }, { status: 400 });
    }

    const { data, error } = await ctx.supabaseAdmin
      .from('profiles')
      .select('step')
      .eq('phone', phone)
      .maybeSingle();
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const status: Status = !data ? 'new' : data.step === 'complete' ? 'complete' : 'incomplete';
    return Response.json({ status });
  }),
};
