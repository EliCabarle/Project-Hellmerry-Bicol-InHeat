-- 0004_set_my_score.sql
-- Run once in the Supabase SQL Editor (Dashboard -> SQL Editor -> Run).
-- Re-runnable: create or replace touches no table and no view, so it is safe to
-- apply again after other migrations land.
--
-- HP -> leaderboard. 0003 revokes UPDATE on public.user_profiles and grants only
-- update(handle), so a browser cannot write `score` directly ("permission denied
-- for column score"). This function is the single door that writes it.
--
-- Abuse ceiling: the client sends its local HP total, which is self-reported and
-- editable in devtools, so the server refuses anything above 100 HP per day of
-- account age (day 0 = 100, +100/day, hard floor 100000). A fresh account that
-- sends 9999999 stores 100. The ceiling is computed from created_at, a server
-- value, so nothing on the wire can raise it.

create or replace function public.set_my_score(p_score integer)
returns integer
language plpgsql
security definer
-- Pin the schema: a security definer function resolves unqualified names with
-- the caller's search_path unless this is set.
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

  -- `score >= 0` is also a table check; clamp here so a bad payload cannot
  -- raise a constraint error instead of returning a value the UI can explain.
  update public.user_profiles
     set score = least(greatest(0, p_score), v_cap)
   where user_id = auth.uid();

  -- Returned so the client can say "capped at N" instead of silently clipping.
  return v_cap;
end;
$$;

-- Functions are executable by PUBLIC by default, which would let the anon key
-- call this. Revoke everything, then grant only to signed-in users.
revoke all on function public.set_my_score(integer) from public, anon;
grant execute on function public.set_my_score(integer) to authenticated;
