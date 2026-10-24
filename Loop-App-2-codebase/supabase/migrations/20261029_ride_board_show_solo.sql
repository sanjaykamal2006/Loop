-- ==============================================================================
-- 20261029_ride_board_show_solo.sql
-- Feature: show the caller's own solo ride want on the board at count = 1.
--
-- Before: groups with count(*) < 2 were hidden from everyone, including the
-- student who posted — a solo want existed only as a toast confirmation.
-- After:  the caller's OWN group always appears (intent_count = 1 with
--         has_mine = true) so they can see their want is live; groups with only
--         OTHER people's rows stay hidden until a second student joins
--         (the match board stays anonymous-until-paired).
--
-- Invariants preserved:
--   * Aggregate-only output: no identity columns, has_mine stays boolean.
--   * Caller resolved server-side via public.current_caller_id() (20261028).
--   * Expiry filter, ordering (count desc, depart_date asc) and limit 20
--     unchanged; ADD ACLs unchanged (authenticated-only).
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
  -- Match threshold for others; the caller's own group is always visible,
  -- even when they are the only student in it (solo rows show to owner only).
  having count(*) >= 2
      or bool_or(r.user_id = v_caller_id)
  order by count(*) desc, r.depart_date asc
  limit 20;
end;
$$;

revoke all on function public.get_ride_intent_board() from public;
revoke all on function public.get_ride_intent_board() from anon;
grant execute on function public.get_ride_intent_board() to authenticated;

notify pgrst, 'reload schema';
