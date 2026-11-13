-- 0008_restore_score_model.sql
-- Run once in the Supabase SQL Editor (Dashboard -> SQL Editor -> Run).
-- Re-runnable: create or replace + drop if exists.
--
-- Choice B: go back to the score model. The client sends its local HP TOTAL and
-- the server stores it (capped by account age). This replaces the event-log
-- system (0005/0007) that kept breaking sync. 0005 had dropped set_my_score;
-- this re-creates it verbatim, then removes the event plumbing.
--
-- Trade-off, stated plainly: the client sends a total again, so a hand-edited
-- localStorage can publish a higher number (still bounded by the account-age
-- cap). That tamper-proofing is what the event log bought, and it is what we are
-- giving up here.
--
-- Run 0004 as well if you want the original file on record; this block is the
-- same function, re-created because 0005 removed it.

create or replace function public.set_my_score(p_score integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer;  -- whole days since the profile row was created
  v_cap  integer;  -- highest score this account may hold today
begin
  -- auth.uid() comes from the JWT, never from the client payload, so the row
  -- selector cannot be forged into someone else's profile.
  select greatest(0, (current_date - created_at::date)) into v_days
    from public.user_profiles
   where user_id = auth.uid();
  -- Signed in but no handle chosen: no profile row, so there is nothing to
  -- update and no leaderboard entry to fill. Caller gets null and says so.
  if not found then return null; end if;

  v_cap := least(100000, 100 + 100 * v_days);

  update public.user_profiles
     set score = least(greatest(0, p_score), v_cap)
   where user_id = auth.uid();

  return v_cap;
end;
$$;

revoke all on function public.set_my_score(integer) from public, anon;
grant execute on function public.set_my_score(integer) to authenticated;

-- Remove the event-log system (0005 + 0007 + the reverted 0006 view).
drop view if exists public.monthly_hp;
drop table if exists public.quest_events cascade;
drop function if exists public.validate_quest_event();
drop function if exists public.recompute_score();