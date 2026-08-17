-- Cache of Paystack's bank list (spec section 8.2). The client reads from
-- this table, not from the Edge Function directly — the function's only job
-- is fetching from Paystack and upserting here.
create table public.banks (
  id uuid primary key default gen_random_uuid (),
  code text not null unique,
  name text not null,
  updated_at timestamptz not null default now()
);

alter table public.banks enable row level security;

-- Public read: any authenticated user needs the bank list for the picker.
-- No insert/update/delete policies — only the service role (used inside
-- the list-banks Edge Function) can write, which bypasses RLS entirely.
create policy "banks_select_all" on public.banks for select using (true);

-- Daily refresh via pg_cron + pg_net, calling the list-banks Edge Function
-- over HTTP. The anon key in the Authorization header is not a secret (it's
-- already embedded in the client app) — the function's own service-role
-- client is what actually has write access to Paystack data and the banks
-- table, regardless of which valid JWT invoked it.
create extension if not exists pg_cron with schema extensions;

create extension if not exists pg_net with schema extensions;

select
  cron.schedule (
    'refresh-banks-daily',
    '0 3 * * *', -- 03:00 UTC daily
    $$
    select
      net.http_post(
        url := 'https://gcnwhamvirqtkipeyggm.supabase.co/functions/v1/list-banks',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjbndoYW12aXJxdGtpcGV5Z2dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2OTY5MzAsImV4cCI6MjEwMjI3MjkzMH0.Z5mvCfT28R62HScPhd0SQMPzxpST83kgsB_2_xEloK0',
          'Content-Type', 'application/json'
        )
      );
    $$
  );
