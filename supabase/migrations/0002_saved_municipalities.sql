-- 0002_saved_municipalities.sql
-- Run once in the Supabase SQL Editor (Dashboard -> SQL Editor -> Run).
-- Independent of 0001_profiles.sql: the FK targets auth.users, not public.profiles,
-- so this file is safe to run whether or not 0001 was ever applied.
--
-- CONCEPT §8 CORE: accounts store saved history. One row per (user, place).
--
-- Not idempotent: a second run fails on "relation already exists".
-- shortcut: single-use migration file, make it re-runnable (drop policy if exists ...
-- before each policy) if a migrations runner ever lands.

-- ---------------------------------------------------------------------------
-- The place key is (name, province), not name alone: 'Bato' and 'San Fernando'
-- each exist twice in Region V (Camarines Sur + Catanduanes / Masbate), so a
-- bare name saves the wrong municipality. This mirrors joinKey() in
-- features/map-controls/src/gis/engine.js.
--
-- Values written are the *narrative* entry's name + province, so the row matches
-- what the ranking screen and map tooltips display. psgc would be the stronger
-- key, but narratives.json does not carry adm3_psgc yet.
-- ---------------------------------------------------------------------------
create table public.user_saved_municipalities (
  -- default auth.uid(): the client inserts { municipality_name, province } only,
  -- and can never write a row belonging to someone else (the policy agrees).
  user_id           uuid        not null default auth.uid()
                                references auth.users(id) on delete cascade,
  municipality_name text        not null,
  province          text        not null,
  saved_at          timestamptz not null default now(),
  -- Natural key: makes "save" idempotent (upsert on conflict = no-op) and
  -- removes the need for a separate unique index. The image's `id` column would
  -- carry no information the PK does not already hold.
  primary key (user_id, municipality_name, province)
);

-- ---------------------------------------------------------------------------
-- RLS. The anon key ships in the client bundle, so these policies ARE the
-- security model: a user may read and delete only their own saved places.
-- No UPDATE policy: a saved-place set has nothing to update but saved_at.
-- ---------------------------------------------------------------------------
alter table public.user_saved_municipalities enable row level security;

create policy saved_select_own on public.user_saved_municipalities
  for select using (auth.uid() = user_id);
create policy saved_insert_own on public.user_saved_municipalities
  for insert with check (auth.uid() = user_id);
create policy saved_delete_own on public.user_saved_municipalities
  for delete using (auth.uid() = user_id);
