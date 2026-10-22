-- ==============================================================================
-- 20261026_ride_intents.sql
-- "Ride Wanted" Demand Aggregation Board
--
-- Enables students to signal ride demand (destination + date + optional note)
-- without committing to a ride, solving the cold-start problem.
--
-- Invariants:
--   1. Privacy Promise: The public board ONLY exposes aggregate demand counts
--      and whether the caller has joined that row (has_mine). It NEVER returns
--      user_id or personal identity columns.
--   2. Strict RLS: public.ride_intents table is owner-isolated. Callers can
--      only read or mutate their own intent rows.
--   3. Thresholds: Only groups with count >= 2 are visible on the board.
--   4. Expiry: Intents expire 2 days after their calendar date and are filtered
--      out of the active board and purged by the cleanup job.
--   5. Least Privilege: Anon has zero access to the table or RPCs; execute
--      is granted to authenticated callers only.
-- ==============================================================================

create table if not exists public.ride_intents (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  destination_key text not null,
  depart_date date not null,
  note text null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint ride_intents_user_dest_date_key unique (user_id, destination_key, depart_date)
);

alter table public.ride_intents enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ride_intents'
      and policyname = 'ride_intents_owner_all'
  ) then
    create policy ride_intents_owner_all on public.ride_intents
      for all
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end $$;

revoke all on public.ride_intents from anon, public;
grant select, insert, update, delete on public.ride_intents to authenticated;

create index if not exists idx_ride_intents_dest_date
  on public.ride_intents (destination_key, depart_date);

-- ==============================================================================
-- RPC #1: get_ride_intent_board()
-- Returns aggregated intent rows where count >= 2 for unexpired dates.
-- Privacy invariant: never includes user_id in the returned projection.
-- ==============================================================================
create or replace function public.get_ride_intent_board()
returns table (
  destination_key text,
  depart_date date,
  intent_count integer,
  has_mine boolean
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
    coalesce(bool_or(r.user_id = v_caller_id), false) as has_mine
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

-- ==============================================================================
-- RPC #2: post_ride_intent(p_destination_key, p_depart_date, p_note)
-- Client signals interest in a ride. Resolves caller securely from auth context.
-- Normalizes destination_key to lowercase trimmed text.
-- Calculates expires_at as (depart_date + 2 days).
-- Returns the new resolved count for that group.
-- ==============================================================================
create or replace function public.post_ride_intent(
  p_destination_key text,
  p_depart_date date,
  p_note text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_clean_dest text;
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

  insert into public.ride_intents (
    user_id,
    destination_key,
    depart_date,
    note,
    expires_at
  ) values (
    v_caller_id,
    v_clean_dest,
    p_depart_date,
    nullif(trim(p_note), ''),
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

revoke all on function public.post_ride_intent(text, date, text) from public;
revoke all on function public.post_ride_intent(text, date, text) from anon;
grant execute on function public.post_ride_intent(text, date, text) to authenticated;

notify pgrst, 'reload schema';
