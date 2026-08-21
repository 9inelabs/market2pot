-- Single source of truth for product categories.
--
-- Until now `products.category` was free text typed by the farmer on Add/Edit
-- Product, and every consumer screen built its filter chips from
-- `select distinct category` over whatever happened to be listed (see the old
-- useProductCategories in src/hooks/useFreshProducts.ts). Two consequences:
-- the chip row changed shape as listings came and went, and two farmers
-- spelling "Vegetables" differently produced two categories.
--
-- Note this table holds the canonical NAMES; products.category stays a text
-- column holding that name rather than becoming a FK. A FK would mean
-- backfilling every existing listing whose free-text category doesn't match
-- one of the eight below, and rewriting every `.eq('category', name)` filter
-- in the app. The requirement is that the list itself lives in exactly one
-- place, which this satisfies — the UI can no longer invent a category.
create table public.categories (
  id uuid primary key default gen_random_uuid (),
  name text not null unique,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

-- Reference data: readable by everyone (anon included, so guest browsing can
-- show the chips), writable by nobody through the API. Curation happens in
-- migrations, not at runtime — there is deliberately no insert/update/delete
-- policy.
create policy "categories_select_all" on public.categories for select using (true);

create index categories_sort_order_idx on public.categories (sort_order);

insert into
  public.categories (name, sort_order)
values
  ('Vegetables', 1),
  ('Fruits', 2),
  ('Grains & Tubers', 3),
  ('Poultry & Eggs', 4),
  ('Meat & Fish', 5),
  ('Herbs & Spices', 6),
  ('Legumes & Nuts', 7),
  ('Dairy', 8)
on conflict (name) do nothing;
