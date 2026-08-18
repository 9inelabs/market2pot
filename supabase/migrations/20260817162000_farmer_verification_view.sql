-- Households need the "Verified farmer" badge when browsing (Home spec
-- section 3/6), but bank_accounts deliberately has NO public-read policy —
-- account_number/bank_name/resolved_account_name must never be exposed to
-- anyone but the owning farmer (see initial_schema.sql's comment on this).
--
-- This view is the "restricted view" that comment already anticipated:
-- created without `security_invoker`, so it runs as the view's owner (the
-- migration role, which bypasses RLS on the underlying table, same as any
-- service-role access) and exposes only a derived boolean — never the raw
-- bank columns — to anyone granted SELECT on the view itself.
create view public.farmer_verification as
select profile_id, (verification_status = 'verified') as is_verified
from public.bank_accounts;

grant select on public.farmer_verification to authenticated;
