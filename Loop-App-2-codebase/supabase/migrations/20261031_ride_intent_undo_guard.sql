-- ==============================================================================
-- 20261031_ride_intent_undo_guard.sql
-- Feature: Delete option for route creator, Undo option for co-passengers.
--
-- 1. get_ride_intent_board() exposes `is_creator boolean`:
--    True if the caller created the earliest intent in the group.
--    Allows UI to present "Delete" for creator and "Undo" for joiners.
--
-- 2. undo_ride_intent(destination_key, depart_date):
--    Removes the caller's own intent row.
--    - For co-passengers: un-joins ("Undo"), drops count by 1.
--    - For creator: deletes creator's spot, remaining co-passengers stay.
-- ==============================================================================

drop function if exists public.get_ride_intent_board();

create or replace function public.get_ride_intent_board()
returns table (
  destination_key text,
  depart_date date,
  intent_count integer,
  has_mine boolean,
  first_depart_time time,
  is_creator boolean
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
    min(r.depart_time) as first_depart_time,
    coalesce((array_agg(r.user_id order by r.created_at asc, r.id asc))[1] = v_caller_id, false) as is_creator
  from public.ride_intents r
  where r.expires_at >= now()
  group by r.destination_key, r.depart_date
  having count(*) >= 1
  order by count(*) desc, r.depart_date asc
  limit 20;
end;
$$;

revoke all on function public.get_ride_intent_board() from public;
revoke all on function public.get_ride_intent_board() from anon;
grant execute on function public.get_ride_intent_board() to authenticated;

create or replace function public.undo_ride_intent(
  p_destination_key text,
  p_depart_date date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_clean text;
  v_deleted integer;
begin
  v_caller_id := public.current_caller_id();

  if v_caller_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'Authentication required';
  end if;

  v_clean := lower(trim(coalesce(p_destination_key, '')));
  if v_clean = '' or p_depart_date is null then
    return 0;
  end if;

  delete from public.ride_intents
  where user_id = v_caller_id
    and destination_key = v_clean
    and depart_date = p_depart_date;

  get diagnostics v_deleted = row_count;
  return coalesce(v_deleted, 0);
end;
$$;

revoke all on function public.undo_ride_intent(text, date) from public;
revoke all on function public.undo_ride_intent(text, date) from anon;
grant execute on function public.undo_ride_intent(text, date) to authenticated;

notify pgrst, 'reload schema';

-- Enable Supabase Realtime for ride_intents so changes broadcast immediately.
-- Guarded twice: the pipeline's embedded PG17 has no supabase_realtime
-- publication at all (no-op there); on Supabase, only add membership if the
-- table is not already in the publication.
do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ride_intents'
  ) then
    alter publication supabase_realtime add table public.ride_intents;
  end if;
end $$;
