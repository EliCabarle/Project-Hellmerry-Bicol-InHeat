-- 0005_quest_events.sql
-- Run once in the Supabase SQL Editor (Dashboard -> SQL Editor -> Run).
-- Re-runnable: create ... if not exists + create or replace.
--
-- Why this replaces set_my_score: the old function took a client-supplied TOTAL,
-- which a hand-edited localStorage could inflate. Now the client only ever sends
-- EVENTS, and user_profiles.score is derived from them by a trigger. The client
-- has no code path that writes a score.
--
-- What this cannot do: quests are self-reported, so a user can still claim five
-- completions a day they did not do. The server bounds each event (<= 68 HP),
-- counts them (<= 5 awards/day, <= 1 login/day) and rejects future dates. The
-- ceiling is ~404 HP/day instead of 9,999,999.

create table if not exists public.quest_events (
  event_id  text primary key,                -- client's stable id; dedupes re-syncs
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date      date not null,
  kind      text not null check (kind in ('login', 'quest')),
  quest_id  text,
  hp        integer not null,
  at        bigint not null,
  created_at timestamptz not null default now()
);

-- The monthly bar sums a date range; the score trigger sums per user.
create index if not exists quest_events_user_day on public.quest_events (user_id, date);
create index if not exists quest_events_date on public.quest_events (date);

alter table public.quest_events enable row level security;

-- Append-only: no update or delete policy exists, so a client cannot rewrite
-- history. A user only ever sees and inserts their own rows.
create policy "read own quest events" on public.quest_events
  for select using (user_id = auth.uid());
create policy "insert own quest events" on public.quest_events
  for insert with check (user_id = auth.uid());

revoke all on public.quest_events from public, anon;
grant select, insert on public.quest_events to authenticated;

-- Bounds every inserted event. Manila day, because the whole game runs on it.
create or replace function public.validate_quest_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today  date := (now() at time zone 'Asia/Manila')::date;
  v_awards integer;
  v_logins integer;
begin
  if new.date > v_today then
    raise exception 'event date % is in the future', new.date;
  end if;

  if new.kind = 'login' then
    if new.hp < 1 or new.hp > 64 then
      raise exception 'login hp % out of range 1..64', new.hp;
    end if;
    select count(*) into v_logins
      from public.quest_events
     where user_id = new.user_id and date = new.date and kind = 'login';
    if v_logins >= 1 then
      raise exception 'one login award per day';
    end if;
  else
    if coalesce(new.quest_id, '') = '' then
      raise exception 'quest_id is required for a quest event';
    end if;
    if new.hp = 0 or abs(new.hp) > 68 then
      raise exception 'quest hp % out of range -68..68', new.hp;
    end if;
    if new.hp > 0 then
      select count(*) into v_awards
        from public.quest_events
       where user_id = new.user_id and date = new.date and kind = 'quest' and hp > 0;
      if v_awards >= 5 then
        raise exception 'daily quest limit reached (5 per day)';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists quest_events_validate on public.quest_events;
create trigger quest_events_validate
  before insert on public.quest_events
  for each row execute function public.validate_quest_event();

-- score is derived, never supplied. SECURITY DEFINER so the trigger can write
-- user_profiles.score even though 0003 revoked that column from clients.
create or replace function public.recompute_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  if tg_op = 'DELETE' then
    v_user := old.user_id;
  else
    v_user := new.user_id;
  end if;

  update public.user_profiles p
     set score = (
       select coalesce(sum(e.hp), 0)
         from public.quest_events e
        where e.user_id = v_user
     )
   where p.user_id = v_user;

  return null;
end;
$$;

drop trigger if exists quest_events_score on public.quest_events;
create trigger quest_events_score
  after insert or delete on public.quest_events
  for each row execute function public.recompute_score();

-- Close the old door for good. safe whether or not 0004 was ever applied.
drop function if exists public.set_my_score(integer);