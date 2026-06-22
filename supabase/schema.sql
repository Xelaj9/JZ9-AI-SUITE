-- ════════════════════════════════════════════════════════════════════
--  JZ9suite — Database schema (Supabase / Postgres)
--  Run this in: Supabase Dashboard → SQL Editor → New query → Run
--  Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where possible.
-- ════════════════════════════════════════════════════════════════════

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ── Helper: is the current user an admin? ──────────────────────────────
-- SECURITY DEFINER so it can read profiles without tripping RLS recursion.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── Helper: keep updated_at fresh ──────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ════════════════════════════════════════════════════════════════════
--  TABLE: profiles  (1:1 with auth.users)
-- ════════════════════════════════════════════════════════════════════
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text,
  email         text,
  avatar_url    text,
  role          text not null default 'user' check (role in ('user','admin')),
  is_disabled   boolean not null default false,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);
alter table public.profiles enable row level security;

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Policies: a user sees/edits only their own profile; admins see/edit all.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
  -- ^ users may update their own row but NOT escalate their role.

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ════════════════════════════════════════════════════════════════════
--  TABLE: prompts
-- ════════════════════════════════════════════════════════════════════
create table if not exists public.prompts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  title          text not null,
  description    text,
  prompt_content text,
  category       text,
  tags           text[] default '{}',
  use_case       text,        -- food_poster | product_ad | announcement | menu | banner | social_media | game_promotion | hiring_post | custom
  style_preset   text,
  canvas_size    text,
  tone_color     text,
  reference_note text,
  is_favorite    boolean not null default false,
  is_archived    boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.prompts enable row level security;

create index if not exists prompts_user_idx on public.prompts(user_id);
create index if not exists prompts_use_case_idx on public.prompts(use_case);

drop trigger if exists prompts_set_updated on public.prompts;
create trigger prompts_set_updated before update on public.prompts
  for each row execute function public.set_updated_at();

drop policy if exists prompts_owner_all on public.prompts;
create policy prompts_owner_all on public.prompts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists prompts_admin_read on public.prompts;
create policy prompts_admin_read on public.prompts
  for select using (public.is_admin());

-- ════════════════════════════════════════════════════════════════════
--  TABLE: image_assets  (the uploaded files)
-- ════════════════════════════════════════════════════════════════════
create table if not exists public.image_assets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  filename    text,
  file_size   bigint,
  mime_type   text,
  storage_path text not null,        -- path inside the storage bucket
  image_url   text,                  -- public or signed URL (optional cache)
  created_at  timestamptz not null default now()
);
alter table public.image_assets enable row level security;

create index if not exists image_assets_user_idx on public.image_assets(user_id);

drop policy if exists image_assets_owner_all on public.image_assets;
create policy image_assets_owner_all on public.image_assets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists image_assets_admin_read on public.image_assets;
create policy image_assets_admin_read on public.image_assets
  for select using (public.is_admin());

-- ════════════════════════════════════════════════════════════════════
--  TABLE: prompt_images  (join: prompt ⇄ image, many-to-many)
-- ════════════════════════════════════════════════════════════════════
create table if not exists public.prompt_images (
  id         uuid primary key default gen_random_uuid(),
  prompt_id  uuid not null references public.prompts(id) on delete cascade,
  image_id   uuid not null references public.image_assets(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade, -- denormalized for RLS
  created_at timestamptz not null default now(),
  unique (prompt_id, image_id)
);
alter table public.prompt_images enable row level security;

drop policy if exists prompt_images_owner_all on public.prompt_images;
create policy prompt_images_owner_all on public.prompt_images
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists prompt_images_admin_read on public.prompt_images;
create policy prompt_images_admin_read on public.prompt_images
  for select using (public.is_admin());

-- ════════════════════════════════════════════════════════════════════
--  TABLE: usage_events  (analytics)
-- ════════════════════════════════════════════════════════════════════
create table if not exists public.usage_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,  -- user_login | prompt_created | prompt_updated | prompt_deleted | image_uploaded | prompt_copied | prompt_favorited
  metadata   jsonb default '{}',
  created_at timestamptz not null default now()
);
alter table public.usage_events enable row level security;

create index if not exists usage_events_user_idx on public.usage_events(user_id);
create index if not exists usage_events_type_idx on public.usage_events(event_type);
create index if not exists usage_events_created_idx on public.usage_events(created_at);

drop policy if exists usage_events_insert_own on public.usage_events;
create policy usage_events_insert_own on public.usage_events
  for insert with check (user_id = auth.uid());

drop policy if exists usage_events_select_own on public.usage_events;
create policy usage_events_select_own on public.usage_events
  for select using (user_id = auth.uid() or public.is_admin());

-- ════════════════════════════════════════════════════════════════════
--  TABLE: app_settings  (key/value, admin-managed)
-- ════════════════════════════════════════════════════════════════════
create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;

-- everyone signed-in can read settings (e.g. appName, maintenanceMode);
-- only admins can change them.
drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings
  for select using (auth.role() = 'authenticated');

drop policy if exists app_settings_admin_write on public.app_settings;
create policy app_settings_admin_write on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ════════════════════════════════════════════════════════════════════
--  STORAGE: bucket "prompt-images"  (private, per-user folders)
--  Path convention:  <user_id>/<filename>
-- ════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('prompt-images', 'prompt-images', false)
on conflict (id) do nothing;

drop policy if exists "prompt_images_storage_owner" on storage.objects;
create policy "prompt_images_storage_owner" on storage.objects
  for all
  using (
    bucket_id = 'prompt-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'prompt-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "prompt_images_storage_admin_read" on storage.objects;
create policy "prompt_images_storage_admin_read" on storage.objects
  for select
  using (bucket_id = 'prompt-images' and public.is_admin());
