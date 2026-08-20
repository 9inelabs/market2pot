-- Consumer-side build (chat enhancements): attachments and reply-to.
-- Emoji needs no schema change (plain unicode text); typing indicators use
-- Realtime Broadcast, not a persisted column. content stays `not null` but
-- an attachment-only message now sends `''` for it client-side.
alter table public.messages add column attachment_url text;
alter table public.messages add column attachment_type text check (attachment_type in ('image'));
alter table public.messages add column reply_to_id uuid references public.messages (id) on delete set null;

-- Same pattern as product_photos_storage_bucket.sql: public read, write
-- RLS-scoped to a {user_id}/... folder.
insert into
  storage.buckets (id, name, public)
values
  ('message-attachments', 'message-attachments', true)
on conflict (id) do nothing;

create policy "message_attachments_public_read" on storage.objects for select
using (bucket_id = 'message-attachments');

create policy "message_attachments_insert_own" on storage.objects for insert
with check (
  bucket_id = 'message-attachments'
  and (storage.foldername (name)) [1] = auth.uid ()::text
);
