-- 0001_profiles.sql
-- Run once in the Supabase SQL Editor (Dashboard -> SQL Editor -> Run).
-- Google identity already lives in auth.users; this adds the only two
-- app-owned tables: the public handle, and the leaderboard score.
-- CONCEPT §9 privacy guard: a handle only, never a real name.
--
-- Not idempotent: a second run fails on "relation already exists".
-- shortcut: single-use migration file, make it re-runnable if you start
-- adding a migrations runner (drop policy if exists ... before each policy).

-- ---------------------------------------------------------------------------
-- profiles: one row per user who has chosen a handle.
-- No row = signed in but not onboarded, so a missing row IS the onboarding gate.
-- ---------------------------------------------------------------------------
create table public.profiles (
  -- Same id as auth.users: this is the auth link. Cascade means deleting the
  -- account removes the profile with it.
  id         uuid        primary key references auth.users(id) on delete cascade,
  -- The only personal data stored.
  username   text        not null,
  created_at timestamptz not null default now(),
  constraint profiles_username_fmt check (username ~ '^[A-Za-z0-9_]{3,20}$')
);

-- Case-insensitive uniqueness: "Leonel" and "leonel" cannot both register.
-- Also serves `where lower(username) = lower($1)` lookups.
create unique index profiles_username_key on public.profiles (lower(username));

-- ---------------------------------------------------------------------------
-- progress: one row per onboarded user, holding the leaderboard score.
-- ---------------------------------------------------------------------------
create table public.progress (
  user_id    uuid        primary key references public.profiles(id) on delete cascade,
  points     integer     not null default 0 check (points >= 0),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS. The anon key ships in the client bundle, so these policies ARE the
-- security model: a user may read and write only their own rows.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.progress enable row level security;

create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy progress_select_own on public.progress
  for select using (auth.uid() = user_id);
create policy progress_insert_own on public.progress
  for insert with check (auth.uid() = user_id);
create policy progress_update_own on public.progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Leaderboard: the one public surface. A view, not a policy, so anon reads
-- exactly handle + points and nothing else — adding a private column to
-- profiles later stays private. Runs as its owner and bypasses the RLS above,
-- which is why it must never select anything sensitive.
-- Left join so a freshly onboarded user shows at 0 points, not missing.
-- ---------------------------------------------------------------------------
create view public.leaderboard as
  select p.username,
         coalesce(pr.points, 0) as points,
         p.created_at
    from public.profiles p
    left join public.progress pr on pr.user_id = p.id
   order by coalesce(pr.points, 0) desc, p.created_at asc;

grant select on public.leaderboard to anon, authenticated;
