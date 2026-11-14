-- 0009_hp_events.sql
-- Run once in the Supabase SQL Editor (Dashboard -> SQL Editor -> Run).
-- Re-runnable: drop if exists + create or replace.
--
-- Single source of truth for Heat Points. The client sends EVENTS (one per
-- submitted quest, one per daily login). The server stores them, bounds each
-- one, and derives user_profiles.score by summing them. There is no RPC that
-- accepts a client-supplied total any more.
--
-- Why this replaced set_my_score: a client-sent total is editable in devtools,
-- so the leaderboard trusted the browser. Here the browser can only insert
-- bounded rows, and re-sending them is harmless (the primary key dedupes).
--
-- Weekly bar: the collective_weekly_hp view sums kind='quest' rows per ISO week
-- (Monday start). A new week has no rows yet, so the bar reads 0 without any
-- scheduled reset. Past weeks stay in the table, so they are the archive.
--
-- Known ceiling: quests are self-reported, so the server cannot tell a real
-- completion from a claimed one. It can bound how many count per account per
-- day (5) and what each is worth (<= 68). Backfill is allowed on purpose
-- (date <= today, no lower bound), so the lifetime total is bounded only by how
-- many past days a tampered client chooses to claim. The current week's bar is
-- still limited to days that have already happened.

-- Remove the superseded event log and the client-total door. Safe whether or
-- not 0005 / 0007 / 0008 were applied.
drop view     if exists public.monthly_hp;
drop table    if exists public.quest_events cascade;
drop function if exists public.validate_quest_event();
drop function if exists public.set_my_score(integer);

create table public.hp_events (
  user_id    uuid    not null default auth.uid() references auth.users(id) on delete cascade,
  date       date    not null,
  kind       text    not null check (kind in ('login', 'quest')),
  quest_id   text    not null default '',
  hp         integer not null check (hp between 1 and 68),
  created_at timestamptz not null default now(),
  -- One row per account per day per kind per quest: re-sending an event is a
  -- no-op, which is what makes the client's retry-everything sync safe.
  primary key (user_id, date, kind, quest_id),
  -- A quest row must name a quest; a login row must not.
  check ((kind = 'quest') = (quest_id <> ''))
);

-- The weekly view groups by date; the per-day cap counts by (user, date).
create index if not exists hp_events_date on public.hp_events (date);

alter table public.hp_events enable row level security;

-- No policies on purpose: nobody reads or writes this table directly. Writes go
-- through record_events (security definer); the view reads as its owner. So the
-- RPC below is the only way in, which makes its checks the whole enforcement.
revoke all on public.hp_events from public, anon, authenticated;

-- Accepts a batch of events and inserts the legal ones. Returns how many landed.
-- Cap: at most 5 quest rows per account per Manila date, enforced under a
-- per-account advisory lock so two parallel calls cannot both see 4 and insert.
create or replace function public.record_events(p_events jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_e     jsonb;
  v_kind  text;
  v_q     text;
  v_hp    integer;
  v_d     date;
  v_n     integer;
  v_ins   integer := 0;
begin
  if jsonb_typeof(p_events) is distinct from 'array' then
    raise exception 'events must be a JSON array';
  end if;
  if jsonb_array_length(p_events) > 500 then
    raise exception 'too many events in one batch (max 500)';
  end if;

  -- One lock per account: serializes this user's writes for the whole call, so
  -- the count-then-insert below cannot be raced by a second request.
  perform pg_advisory_xact_lock(hashtext('hp:' || auth.uid()::text)::bigint);

  for v_e in select * from jsonb_array_elements(p_events)
  loop
    v_kind := v_e->>'kind';
    v_q    := coalesce(v_e->>'quest_id', '');

    -- Validate before casting: a malformed value would otherwise abort the
    -- whole batch instead of dropping one bad row.
    if coalesce(v_e->>'date', '') !~ '^\d{4}-\d{2}-\d{2}$' then continue; end if;
    if coalesce(v_e->>'hp', '') !~ '^-?\d+$' then continue; end if;

    v_d  := (v_e->>'date')::date;
    v_hp := (v_e->>'hp')::int;

    if v_d > v_today then continue; end if;  -- no future events

    if v_kind = 'login' then
      if v_hp < 1 or v_hp > 64 then continue; end if;
      insert into public.hp_events (user_id, date, kind, quest_id, hp)
      values (auth.uid(), v_d, 'login', '', v_hp)
      on conflict do nothing;
      if found then v_ins := v_ins + 1; end if;

    elsif v_kind = 'quest' then
      if v_q = '' or v_hp < 1 or v_hp > 68 then continue; end if;

      select count(*) into v_n
        from public.hp_events
       where user_id = auth.uid() and date = v_d and kind = 'quest';
      if v_n >= 5 then continue; end if;  -- 5 quests/day: drop the extras

      insert into public.hp_events (user_id, date, kind, quest_id, hp)
      values (auth.uid(), v_d, 'quest', v_q, v_hp)
      on conflict do nothing;
      if found then v_ins := v_ins + 1; end if;

    end if;  -- unknown kind: dropped
  end loop;

  return v_ins;
end;
$$;

revoke all on function public.record_events(jsonb) from public, anon;
grant execute on function public.record_events(jsonb) to authenticated;

-- score is derived, never supplied. security definer so the trigger can write
-- user_profiles.score even though 0003 revoked that column from clients.
create or replace function public.recompute_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_profiles p
     set score = (
       select coalesce(sum(e.hp), 0)::int
         from public.hp_events e
        where e.user_id = new.user_id
     )
   where p.user_id = new.user_id;
  return null;
end;
$$;

drop trigger if exists hp_events_score on public.hp_events;
create trigger hp_events_score
  after insert on public.hp_events
  for each row execute function public.recompute_score();

-- The collective weekly bar: quest HP per ISO week (Monday start; `date` is
-- already a Manila day). Aggregates only -- no per-user rows are exposed.
create or replace view public.collective_weekly_hp as
  select date_trunc('week', date)::date as week,
         sum(hp)::int                 as hp,
         count(distinct user_id)::int as contributors
    from public.hp_events
   where kind = 'quest'
   group by 1;

grant select on public.collective_weekly_hp to anon, authenticated;