-- ==============================================================================
-- 20261030_board_demand_public.sql
-- Feature flip requested after owner-only solo rows (20261029) shipped:
-- solo ride wants are now PUBLIC demand, not owner-only.
--
-- Why: the board only sparks meetups when non-members can SEE that demand
-- exists. Owner-only solo rows let a student see their own post while any
-- other student sees an empty board — the chicken-and-egg the co-founding
-- user hit live ("I can't see anything in the active routes").
--
-- Change: drop the member-visibility distinction — every active group with
-- count(*) >= 1 is visible to every authenticated caller. has_mine keeps
-- marking ownership; groups still key on destination + date (times are
-- informational, so 06:30 and 06:45 posts land in the same group).
--
-- Supersedes the owner-only HAVING added in 20261029 (same shipped shape,
-- visibility widened); the anonymous-until-paired property still holds:
-- rows are aggregate counts, never identities.
-- ==============================================================================

create or replace function public.get_ride_intent_board()
returns table (
  destination_key text,
  depart_date date,
  intent_count integer,
  has_mine boolean,
  first_depart_time time
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
begin
  v_caller_id := public.current_caller_id();

  return query
  select
    r.destination_key,
    r.depart_date,
    count(*)::integer as intent_count,
    coalesce(bool_or(r.user_id = v_caller_id), false) as has_mine,
    min(r.depart_time) as first_depart_time
  from public.ride_intents r
  where r.expires_at >= now()
  group by r.destination_key, r.depart_date
  -- Public demand board: every active group shows to everyone, even a solo
  -- poster (count >= 1). Identity stays hidden; times are informational.
  having count(*) >= 1
  order by count(*) desc, r.depart_date asc
  limit 20;
end;
$$;

revoke all on function public.get_ride_intent_board() from public;
revoke all on function public.get_ride_intent_board() from anon;
grant execute on function public.get_ride_intent_board() to authenticated;

notify pgrst, 'reload schema';
