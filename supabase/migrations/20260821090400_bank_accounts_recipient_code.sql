-- Consumer-side build. Caches the Paystack transfer-recipient code for a
-- bank_accounts row so payouts/refunds don't recreate one on every transfer
-- (Paystack recipient creation is a real API call worth avoiding on repeat
-- disbursements to the same account). Written only by service-role Edge
-- Functions — no column grant for `authenticated`, mirroring the existing
-- protected-columns pattern on this table.
alter table public.bank_accounts add column paystack_recipient_code text;
