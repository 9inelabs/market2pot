-- RLS is row-level only: the existing bank_accounts_update_own policy lets a
-- farmer update every column of their own row, including
-- verification_status and name_match_score — which would let them
-- self-verify (e.g. set verification_status = 'verified',
-- name_match_score = 1.0) directly from the client, defeating account-name
-- verification entirely. Column-level GRANTs are the only way to restrict
-- this, since RLS policies cannot scope to individual columns.
--
-- Only UPDATE is revoked here, matching what was asked. The identical bypass
-- still exists at INSERT time today: bank_accounts_insert_own lets a farmer
-- INSERT their own row with resolved_account_name/name_match_score/
-- verification_status set to anything they like, since those columns are
-- `not null` with no default and INSERT privilege on them hasn't been
-- touched. Revoking INSERT on them too would mean the client can no longer
-- create a bank_accounts row directly at all (the not-null columns couldn't
-- be populated), forcing the entire row creation through a service-role
-- Edge Function instead of a client-side insert — a bigger structural change
-- than this migration makes on its own. Flagged for a decision before phase
-- 7 (Paystack Edge Functions / bank-details screen) is built, not resolved
-- here.

revoke
update (resolved_account_name, name_match_score, verification_status)
on public.bank_accounts
from authenticated;
