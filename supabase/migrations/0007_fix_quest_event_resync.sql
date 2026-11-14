-- 0007_fix_quest_event_resync.sql
-- Run once in the Supabase SQL Editor (Dashboard -> SQL Editor -> Run).
-- Re-runnable: create or replace function. (0006 was reverted; the gap is intentional.)
--
-- Bug this fixes: the client re-sends its WHOLE event log on every sync, and the
-- upsert is ON CONFLICT (event_id) DO NOTHING. But a BEFORE INSERT row trigger
-- still fires for a row that the conflict clause then skips. So every sync after
-- the first re-validated today's already-stored login/quest rows, hit
-- "one login award per day" / "daily quest limit reached", and aborted the whole
-- batch. Symptom: progress stopped syncing the moment the first sync succeeded.
--
-- Fix: skip validation when the event_id already exists. That row is already
-- stored and will be skipped by ON CONFLICT DO NOTHING, so re-checking it is both
-- wrong and fatal. Brand-new rows are still fully validated.

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
  -- Re-sync of an event we already hold: let ON CONFLICT DO NOTHING drop it.
  if exists (select 1 from public.quest_events where event_id = new.event_id) then
    return new;
  end if;

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

-- Verify after applying (replace the uuid with your own auth user id):
--   select count(*) from public.quest_events where user_id = '<uuid>';
-- Complete a quest, reload, complete another: both must land, and the count must
-- keep rising instead of the sync erroring.
