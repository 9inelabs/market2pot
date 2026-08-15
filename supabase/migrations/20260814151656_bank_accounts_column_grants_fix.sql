-- Corrects 20260814145823_bank_accounts_column_grants.sql, which had no
-- effect: `authenticated`'s UPDATE privilege on bank_accounts was granted at
-- the TABLE level (Supabase's default `GRANT ALL ON ALL TABLES IN SCHEMA
-- public`), and a column-specific REVOKE only removes column-specific ACL
-- entries — it cannot subtract a column from a table-wide grant, because
-- Postgres's column-privilege check falls back to the table-level ACL when
-- no column-specific entry exists. Confirmed via
-- `select * from information_schema.column_privileges where table_name =
-- 'bank_accounts'` showing `authenticated` still had UPDATE on
-- verification_status/name_match_score/resolved_account_name after the
-- previous migration, and via scripts/test-rls.ts's self-verify assertion
-- actually failing (the write succeeded when it should have been rejected).
--
-- The correct pattern: revoke the table-wide UPDATE grant entirely, then
-- re-grant UPDATE only on the columns authenticated should be able to write.
-- id/profile_id/created_at are intentionally left out too — the client has
-- no legitimate reason to update those.

revoke
update on public.bank_accounts
from authenticated;

grant
update (bank_code, bank_name, account_number) on public.bank_accounts to authenticated;
