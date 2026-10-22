-- ==============================================================================
-- 20261027_ride_wants_time.sql
-- "Find Co-Travellers" wording + optional travel time on ride intents
--
-- Adds public.ride_intents.depart_time (time, nullable) so students can give a
-- rough departure time when posting demand. The board keeps day-level matching
-- (destination + date) and additionally exposes first_depart_time = the
-- earliest time mentioned in the group, used as a hint and as the pre-fill for
-- "Create This Ride".
--
-- Invariants preserved:
--   1. Privacy: board aggregates only; no user identity columns.
--   2. RLS owner isolation + initplan policy unchanged (table policies live).
--   3. post_ride_intent stays server-caller-resolved; the new p_depart_time is
--      strictly validated before cast ("HH:MM" only) and is optional.
--   4. post_ride_intent signature changes (text, date, text) -> (text, date,
--      text, text), so the old overload is dropped and privileges are
--      re-granted on the new signature. The board RPC return type changed
--      (new nullable column), so it is dropped and recreated atomically.
-- ==============================================================================

alter table public.ride_intents add column if not exists depart_time time null;

-- --- post_ride_intent: new optional p_depart_time parameter -------------------
drop function if exists public.post_ride_intent(text, date, text);

create or replace function public.post_ride_intent(
  p_destination_key text,
  p_depart_date date,
  p_note text default null,
  p_depart_time text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_clean_dest text;
  v_time time;
  v_count integer;
begin
  v_caller_id := coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    '00000000-0000-0000-0000-000000000000'
  )::uuid;

  if v_caller_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'Authentication required';
  end if;

  v_clean_dest := lower(trim(coalesce(p_destination_key, '')));
  if v_clean_dest = '' then
    return 0;
  end if;

  if p_depart_date is null then
    return 0;
  end if;

  -- Strict "HH:MM" validation; anything else is rejected loudly instead of
  -- silently being dropped.
  if p_depart_time is not null then
    if p_depart_time !~ '^\d{1,2}:\d{2}$' then
      raise exception 'Invalid time format: expected HH:MM';
    end if;
    v_time := p_depart_time::time;
  end if;

  insert into public.ride_intents (
    user_id,
    destination_key,
    depart_date,
    note,
    depart_time,
    expires_at
  ) values (
    v_caller_id,
    v_clean_dest,
    p_depart_date,
    nullif(trim(p_note), ''),
    v_time,
    (p_depart_date + interval '2 days')::timestamptz
  )
  on conflict (user_id, destination_key, depart_date) do nothing;

  select count(*)::integer into v_count
  from public.ride_intents
  where destination_key = v_clean_dest
    and depart_date = p_depart_date;

  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.post_ride_intent(text, date, text, text) from public;
revoke all on function public.post_ride_intent(text, date, text, text) from anon;
grant execute on function public.post_ride_intent(text, date, text, text) to authenticated;

-- --- get_ride_intent_board: expose first_depart_time (earliest mention) -------
drop function if exists public.get_ride_intent_board();

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
  v_caller_id := coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    '00000000-0000-0000-0000-000000000000'
  )::uuid;

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
  having count(*) >= 2
  order by count(*) desc, r.depart_date asc
  limit 20;
end;
$$;

revoke all on function public.get_ride_intent_board() from public;
revoke all on function public.get_ride_intent_board() from anon;
grant execute on function public.get_ride_intent_board() to authenticated;

notify pgrst, 'reload schema';
