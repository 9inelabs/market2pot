-- Farmer-side build (app spec sections 1 & 6). Business Settings screen
-- needs somewhere to persist the open/closed toggle and business hours;
-- Edit Profile needs a farm photo distinct from listing photos.
alter table public.farmer_profiles add column business_hours jsonb;

alter table public.farmer_profiles add column is_open_now boolean not null default true;

alter table public.farmer_profiles add column photo_url text;
