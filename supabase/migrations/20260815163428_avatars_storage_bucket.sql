-- Avatar bucket for the profile-picture step (spec section 7.6, applied here
-- to the consumer flow). Public read (avatars are meant to be seen by the
-- other party — a farmer recognizing a consumer's order, or vice versa —
-- not sensitive), but write access is RLS-scoped to the owner via a
-- {user_id}/... folder convention, matching "RLS scoped to auth.uid()".
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');

create policy "avatars_insert_own" on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and (storage.foldername (name)) [1] = auth.uid ()::text
);

create policy "avatars_update_own" on storage.objects
for update
using (
  bucket_id = 'avatars'
  and (storage.foldername (name)) [1] = auth.uid ()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername (name)) [1] = auth.uid ()::text
);

create policy "avatars_delete_own" on storage.objects for delete using (
  bucket_id = 'avatars'
  and (storage.foldername (name)) [1] = auth.uid ()::text
);
