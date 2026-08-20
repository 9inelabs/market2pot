-- Farmer-side build (app spec section 11). Messages inbox + chat thread.
-- Household-side "start a conversation" UI is out of scope for this build
-- (see the phase report), but the schema/RLS/realtime wiring is complete so
-- that phase doesn't need its own migration pass.
create table public.conversations (
  id uuid primary key default gen_random_uuid (),
  farmer_id uuid not null references public.farmer_profiles (id) on delete cascade,
  household_id uuid not null references public.profiles (id) on delete cascade,
  last_message_preview text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (farmer_id, household_id)
);

alter table public.conversations enable row level security;

create policy "conversations_select_participant" on public.conversations for select
using (
  household_id = auth.uid ()
  or farmer_id in (
    select id from public.farmer_profiles where profile_id = auth.uid ()
  )
);

create policy "conversations_insert_participant" on public.conversations for insert
with check (
  household_id = auth.uid ()
  or farmer_id in (
    select id from public.farmer_profiles where profile_id = auth.uid ()
  )
);

create policy "conversations_update_participant" on public.conversations
for update
using (
  household_id = auth.uid ()
  or farmer_id in (
    select id from public.farmer_profiles where profile_id = auth.uid ()
  )
)
with check (
  household_id = auth.uid ()
  or farmer_id in (
    select id from public.farmer_profiles where profile_id = auth.uid ()
  )
);

create table public.messages (
  id uuid primary key default gen_random_uuid (),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.messages enable row level security;

-- Scoped via the parent conversation's participants — same pattern
-- order_items already uses for orders.
create policy "messages_select_via_conversation" on public.messages for select
using (
  exists (
    select 1 from public.conversations
    where conversations.id = messages.conversation_id
      and (
        conversations.household_id = auth.uid ()
        or conversations.farmer_id in (
          select id from public.farmer_profiles where profile_id = auth.uid ()
        )
      )
  )
);

create policy "messages_insert_own_as_participant" on public.messages for insert
with check (
  sender_id = auth.uid ()
  and exists (
    select 1 from public.conversations
    where conversations.id = conversation_id
      and (
        conversations.household_id = auth.uid ()
        or conversations.farmer_id in (
          select id from public.farmer_profiles where profile_id = auth.uid ()
        )
      )
  )
);

-- Lets the recipient (not the sender) mark a message read — read_at is the
-- only column this policy allows changing in practice, enforced client-side
-- by only ever sending { read_at }.
create policy "messages_update_mark_read_as_participant" on public.messages
for update
using (
  exists (
    select 1 from public.conversations
    where conversations.id = messages.conversation_id
      and (
        conversations.household_id = auth.uid ()
        or conversations.farmer_id in (
          select id from public.farmer_profiles where profile_id = auth.uid ()
        )
      )
  )
)
with check (
  exists (
    select 1 from public.conversations
    where conversations.id = conversation_id
      and (
        conversations.household_id = auth.uid ()
        or conversations.farmer_id in (
          select id from public.farmer_profiles where profile_id = auth.uid ()
        )
      )
  )
);

create index messages_conversation_id_created_at_idx on public.messages (conversation_id, created_at);

-- Keeps the inbox preview (last_message_preview/last_message_at) in sync
-- without a client round-trip after every send.
create function public.touch_conversation_on_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
  set last_message_preview = left(new.content, 140), last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
after insert on public.messages
for each row execute function public.touch_conversation_on_message();

-- Realtime: the chat thread subscribes to new rows in this conversation.
alter publication supabase_realtime add table public.messages;
