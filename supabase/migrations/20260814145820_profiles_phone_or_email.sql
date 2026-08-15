-- Google/Apple sign-in (feature-flagged off today, but the trigger runs
-- unconditionally regardless of client flags) provides no phone number, so
-- the original `phone text not null` constraint — and a trigger that only
-- ever set `phone` — would fail signup for those providers at the database
-- level. profiles now tracks whichever identifier auth.users actually has,
-- and requires at least one.

alter table public.profiles
add column email text;

alter table public.profiles
alter column phone
drop not null;

alter table public.profiles
add constraint profiles_phone_or_email_check check (
  phone is not null
  or email is not null
);

create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone, email)
  values (new.id, new.phone, new.email);
  return new;
end;
$$;
