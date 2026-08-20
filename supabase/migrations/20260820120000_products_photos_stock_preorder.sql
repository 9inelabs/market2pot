-- Farmer-side build (app spec section 1). Replaces the single photo_url
-- with a real array so Add/Edit Product can offer a multi-photo picker, and
-- adds the two new per-product fields the Listings/Add-Edit screens need.
alter table public.products add column photo_urls text[] not null default '{}';

-- Backfill: every existing single photo becomes the first (only) entry.
update public.products
set photo_urls = array[photo_url]
where photo_url is not null;

alter table public.products drop column photo_url;

alter table public.products add column low_stock_threshold integer;

alter table public.products add column is_preorder boolean not null default false;

-- Pre-order listings promise a future harvest_date (Home hub's "Upcoming
-- harvest" card queries on this) — not enforced as a hard DB constraint
-- since harvest_date already exists as an optional field for non-preorder
-- listings too; the Add/Edit screen enforces "future date required" at the
-- form level per the spec.

-- PostgREST's query builder can't compare two columns of the same row
-- (quantity_available <= low_stock_threshold) directly — a view is the
-- standard way around that. security_invoker means it still runs under the
-- querying user's own RLS on products (available-or-own), not the view
-- owner's, so a farmer only ever sees their own low-stock rows here, same
-- as querying products directly would give them.
create view public.low_stock_products
with (security_invoker = true) as
select *
from public.products
where low_stock_threshold is not null
  and quantity_available <= low_stock_threshold;
