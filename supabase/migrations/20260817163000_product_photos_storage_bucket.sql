-- Product listing photo bucket. Same pattern as avatars_storage_bucket.sql:
-- public read (a listing's photo needs to be visible to any browsing
-- household), write access RLS-scoped to a {user_id}/... folder so a farmer
-- can only write into their own folder, regardless of which product the
-- photo is for.
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

create policy "product_photos_public_read" on storage.objects for select
using (bucket_id = 'product-photos');

create policy "product_photos_insert_own" on storage.objects for insert
with check (
  bucket_id = 'product-photos'
  and (storage.foldername (name)) [1] = auth.uid ()::text
);

create policy "product_photos_update_own" on storage.objects
for update
using (
  bucket_id = 'product-photos'
  and (storage.foldername (name)) [1] = auth.uid ()::text
)
with check (
  bucket_id = 'product-photos'
  and (storage.foldername (name)) [1] = auth.uid ()::text
);

create policy "product_photos_delete_own" on storage.objects for delete using (
  bucket_id = 'product-photos'
  and (storage.foldername (name)) [1] = auth.uid ()::text
);
