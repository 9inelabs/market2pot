-- Consumer-side build. Every escrow-lifecycle notification needs to deep-
-- link to a specific order (or conversation, for new_message) — the
-- notifications table had no way to reference one. Nullable and untyped
-- (no FK) on purpose: it points at an order in most cases but a
-- conversation for new_message, and there's no single table it always
-- references.
alter table public.notifications add column related_id uuid;

-- New: a message notifies the OTHER participant (not the sender). Mirrors
-- touch_conversation_on_message's own SECURITY DEFINER reasoning — the
-- inserting session is one participant's, which has no write access to a
-- notifications row owned by the other participant's profile_id.
create function public.notify_on_new_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  conv record;
  recipient_profile_id uuid;
  sender_name text;
begin
  select farmer_id, household_id into conv from public.conversations where id = new.conversation_id;

  select profile_id into recipient_profile_id
  from public.farmer_profiles
  where id = conv.farmer_id and profile_id <> new.sender_id;

  if recipient_profile_id is null then
    recipient_profile_id := conv.household_id;
    if recipient_profile_id = new.sender_id then
      recipient_profile_id := null;
    end if;
  end if;

  if recipient_profile_id is not null then
    select full_name into sender_name from public.profiles where id = new.sender_id;
    insert into public.notifications (profile_id, type, title, body, related_id)
    values (
      recipient_profile_id,
      'new_message',
      coalesce(sender_name, 'Someone') || ' sent you a message',
      left(coalesce(new.content, 'Sent a photo'), 140),
      new.conversation_id
    );
  end if;
  return new;
end;
$$;

create trigger messages_notify_recipient
after insert on public.messages
for each row execute function public.notify_on_new_message ();
