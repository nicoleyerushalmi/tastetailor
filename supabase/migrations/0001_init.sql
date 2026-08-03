-- TasteTailor MVP schema
-- Apply in Supabase Dashboard → SQL Editor → New query → Run
-- Source of truth for Phase 1

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  allergies text[] not null default '{}',
  diet_type text not null default 'none',
  goals text[] not null default '{}',
  preferences_notes text,
  onboarding_completed boolean not null default false,
  daily_generation_count integer not null default 0,
  generation_count_reset_at timestamptz not null default (
    date_trunc('day', now() at time zone 'utc') + interval '1 day'
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint diet_type_check check (
    diet_type in (
      'none', 'vegetarian', 'vegan', 'pescatarian',
      'keto', 'paleo', 'mediterranean'
    )
  ),
  constraint daily_generation_count_nonnegative check (daily_generation_count >= 0)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- recipes
-- ---------------------------------------------------------------------------
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  mode text not null,
  persona_query text,
  persona_fallback_used boolean not null default false,
  servings_base integer not null,
  ingredients jsonb not null,
  steps jsonb not null,
  insights jsonb not null,
  source_input jsonb not null,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  constraint recipes_mode_check check (mode in ('adapt', 'scratch')),
  constraint recipes_servings_base_check check (servings_base between 1 and 24),
  constraint recipes_title_len check (char_length(title) between 1 and 160)
);

create index recipes_user_created_idx
  on public.recipes (user_id, created_at desc);

create index recipes_user_favorites_idx
  on public.recipes (user_id, created_at desc)
  where is_favorite = true;

-- ---------------------------------------------------------------------------
-- shopping_list_items
-- ---------------------------------------------------------------------------
create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  display_name text not null,
  quantity numeric not null,
  unit text not null default '',
  is_checked boolean not null default false,
  source_recipe_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint shopping_quantity_positive check (quantity > 0),
  constraint shopping_name_len check (char_length(name) between 1 and 120),
  constraint shopping_list_unique_line unique (user_id, name, unit)
);

create index shopping_list_user_checked_idx
  on public.shopping_list_items (user_id, is_checked);

create trigger shopping_list_set_updated_at
before update on public.shopping_list_items
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Privileges (RLS still restricts rows; without GRANT, API returns 403)
-- ---------------------------------------------------------------------------
grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.recipes to authenticated;
grant select, insert, update, delete on table public.shopping_list_items to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.shopping_list_items enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- inserts happen via security definer trigger; no direct insert policy for users

create policy "recipes_select_own"
  on public.recipes for select
  using (auth.uid() = user_id);

create policy "recipes_insert_own"
  on public.recipes for insert
  with check (auth.uid() = user_id);

create policy "recipes_update_own"
  on public.recipes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "recipes_delete_own"
  on public.recipes for delete
  using (auth.uid() = user_id);

create policy "shopping_select_own"
  on public.shopping_list_items for select
  using (auth.uid() = user_id);

create policy "shopping_insert_own"
  on public.shopping_list_items for insert
  with check (auth.uid() = user_id);

create policy "shopping_update_own"
  on public.shopping_list_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "shopping_delete_own"
  on public.shopping_list_items for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Rate-limit helper (called from /api/generate)
-- ---------------------------------------------------------------------------
create or replace function public.claim_generation_slot(max_per_day integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ok boolean;
begin
  if uid is null then
    return false;
  end if;

  update public.profiles
  set
    daily_generation_count = case
      when generation_count_reset_at <= now() then 1
      else daily_generation_count + 1
    end,
    generation_count_reset_at = case
      when generation_count_reset_at <= now()
        then date_trunc('day', now() at time zone 'utc') + interval '1 day'
      else generation_count_reset_at
    end,
    updated_at = now()
  where id = uid
    and (
      generation_count_reset_at <= now()
      or daily_generation_count < max_per_day
    );

  ok := found;
  return ok;
end;
$$;

revoke all on function public.claim_generation_slot(integer) from public;
grant execute on function public.claim_generation_slot(integer) to authenticated;
