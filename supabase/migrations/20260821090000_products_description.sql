-- Consumer-side build. Product Detail needs somewhere to show "all details"
-- of a listing — nothing beyond name/category/unit exists to describe one.
alter table public.products add column description text;
