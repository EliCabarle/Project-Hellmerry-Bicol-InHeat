-- 0003_user_profiles.sql
-- Run once in the Supabase SQL Editor (Dashboard -> SQL Editor -> Run).
--
-- Merges the two tables 0001_profiles.sql created (profiles: handle,
-- progress: points) into the single user_profiles(user_id, handle, score) the
-- plan calls for, and rebuilds the public leaderboard view on top of it.
--
-- Safe to run whether or not 0001 was ever applied: the carry-over is guarded on
-- to_regclass, and the drops use IF EXISTS. Not idempotent for the CREATE TABLE —
-- a second run fails on "relation already exists". Run once, then move on.
--
-- Where the two numbers come from:
--   score       -> stored. Awarded by a task; none exists yet, so every row is 0.
--   saved_count -> computed per row of public.user_saved_municipalities, never
--                  stored, so it cannot drift when a place is saved or removed.

create table public.user_profiles (
  -- Same id as auth.users: this is the auth link. Cascade means deleting the
  -- account removes the profile (and its leaderboard entry) with it.
  user_id    uuid        primary key references auth.users(id) on delete cascade,
  -- The only personal data stored. CONCEPT §9: a chosen handle, never a real name.
  handle     text        not null,
  -- Task score. Write-protected below: clients may change `handle` and nothing else.
  score      integer     not null default 0 check (score >= 0),
  created_at timestamptz not null default now(),
  constraint user_profiles_handle_fmt check (handle ~ '^[A-Za-z0-9_]{3,20}$')
);

-- Case-insensitive uniqueness: "Leonel" and "leonel" cannot both register.
create unique index user_profiles_handle_key on public.user_profiles (lower(handle));

-- Carry over anything 0001 created. Normally zero rows — nothing in the app has
-- ever written to those tables — but the copy costs nothing and means an
-- existing handle is never silently lost.
do $$
begin
  if to_regclass('public.profiles') is not null then
    insert into public.user_profiles (user_id, handle, created_at)
      select p.id, p.username, p.created_at from public.profiles p;
    -- progress is only present when 0001 ran; guarded separately so a partial
    -- state still migrates the handles instead of failing the whole script.
    if to_regclass('public.progress') is not null then
      update public.user_profiles up
         set score = pr.points
        from public.progress pr
       where pr.user_id = up.user_id;
    end if;
  end if;
end $$;

-- Drop the view first: it depends on both tables being retired.
drop view  if exists public.leaderboard;
drop table if exists public.progress;   -- holds the FK to profiles
drop table if exists public.profiles;

-- ---------------------------------------------------------------------------
-- RLS + grants. The anon key ships in the client bundle, so policies ARE the
-- security model: a user reads and writes only their own row.
-- ---------------------------------------------------------------------------
alter table public.user_profiles enable row level security;

create policy up_select_own on public.user_profiles
  for select using (auth.uid() = user_id);
create policy up_insert_own on public.user_profiles
  for insert with check (auth.uid() = user_id);
create policy up_update_own on public.user_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- RLS is row-level and cannot stop a single column changing, so the score is
-- protected by a column privilege instead: authenticated may update `handle`,
-- never `score`. A client sending score=999999 gets "permission denied for
-- column score". Score writes belong to a task handler (service role or a
-- security definer function), not the browser.
revoke all    on public.user_profiles from anon;
revoke update on public.user_profiles from authenticated;
grant  select, insert on public.user_profiles to authenticated;
grant  update (handle) on public.user_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Leaderboard: the one public surface. A view, not a table policy, so anon reads
-- exactly handle + score + saved_count and nothing else — adding a private column
-- to user_profiles later stays private. Runs as its owner and bypasses the RLS
-- above, which is why it must never select anything sensitive.
--
-- Left join, so a user who has saved nothing still appears at 0 places.
-- Ordered score-first: until a task awards points every score is 0 and the board
-- falls back to saved_count, then signup order. No view change needed later.
-- ---------------------------------------------------------------------------
create view public.leaderboard as
  select p.handle,
         p.score,
         count(s.municipality_name)::int as saved_count
    from public.user_profiles p
    left join public.user_saved_municipalities s on s.user_id = p.user_id
   group by p.handle, p.score, p.created_at
   order by p.score desc, count(s.municipality_name) desc, p.created_at asc;

grant select on public.leaderboard to anon, authenticated;
