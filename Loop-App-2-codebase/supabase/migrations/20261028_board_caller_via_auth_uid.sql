-- ==============================================================================
-- 20261028_board_caller_via_auth_uid.sql
-- FIX: "Authentication required" for real, logged-in users.
--
-- Root cause (proven by a signed-in-token REST repro on 2026-10-24):
-- Supabase PostgREST no longer sets the per-claim GUC
-- `request.jwt.claim.sub`; the only claim GUC in modern PostgREST is
-- `request.jwt.claims` (the JWT body as JSON). Functions that read the per-claim
-- GUC directly therefore resolved EVERY real caller to the zero uuid:
--   * post_ride_intent       -> raised 'Authentication required' for everyone
--   * get_unread_loop_ids    -> silently returned nothing (badges always empty)
-- while get_ride_intent_board worked but flagged has_mine=false for everyone.
--
-- Caller resolution now goes through auth.uid(), which is Supabase-managed on
-- first-party deployments (its body falls back to request.jwt.claims JSON, so
-- it stays current whatever PostgREST does). In the embedded PG17 pipeline the
-- 20260901 stub supplies auth.uid() and the integration tests set
-- request.jwt.claim.sub, so the same resolution works identically there.
--
-- Invariants preserved:
--   * Board remains aggregate-only; has_mine stays a boolean; no identity cols.
--   * post_ride_intent stays server-caller-resolved; zero-uuid callers still
--     raise loudly instead of silently inserting garbage.
--   * PK conflict behaviour and expiry derivation unchanged.
--   * ACLs unchanged: EXECUTE to authenticated only; anon locked out.
--
-- The 20261025 comment "resolve WITHOUT touching the auth schema" was written
-- against the removed per-claim-GUC contract and no longer holds. We still do
-- not name-resolve auth under the CALLER's privileges: public.current_caller_id()
-- is a tiny SECURITY DEFINER resolver (owner keeps schema-auth USAGE both on
-- Supabase and in the embedded pipeline), so SECURITY INVOKER functions and
-- low-privilege impersonated roles stay guacd-free at call time.
-- ==============================================================================

-- Caller resolver: definer-owned so every role can use it without schema-auth
-- USAGE; the owner always has access to the auth schema. Pinned search_path.
create or replace function public.current_caller_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    auth.uid(),
    '00000000-0000-0000-0000-000000000000'::uuid
  )
$$;

revoke all on function public.current_caller_id() from public;
grant execute on function public.current_caller_id() to authenticated;

-- ---------------------------------------------------------------------------
-- RPC #1: get_ride_intent_board() - board shape unchanged, caller via auth.uid()
-- ---------------------------------------------------------------------------
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
  having count(*) >= 2
  order by count(*) desc, r.depart_date asc
  limit 20;
end;
$$;

revoke all on function public.get_ride_intent_board() from public;
revoke all on function public.get_ride_intent_board() from anon;
grant execute on function public.get_ride_intent_board() to authenticated;

-- ---------------------------------------------------------------------------
-- RPC #2: post_ride_intent(text, date, text, text) - caller via auth.uid()
-- ---------------------------------------------------------------------------
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
  v_caller_id := public.current_caller_id();

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

-- ---------------------------------------------------------------------------
-- RPC #3: get_unread_loop_ids() - caller via auth.uid() (badges were silently
-- empty for everyone in modern PostgREST)
-- ---------------------------------------------------------------------------
create or replace function public.get_unread_loop_ids()
returns table (loop_id uuid)
language sql
stable
security invoker
set search_path = public
as $$
  -- Resolve the caller through public.current_caller_id(): a definer-owned
  -- resolver over auth.uid(), so this invoker function never needs the caller
  -- to hold schema-auth USAGE. The zero-uuid fallback keeps the
  -- "no caller -> no badges" semantics and matches the pipeline stub.
  with caller as (
    select public.current_caller_id() as uid
  )
  select l.id
  from public.loops l, caller c
  where l.status in ('open', 'started', 'active', 'in_progress')
    and l.departure_time >= now() - interval '2 hours'
    and (l.expires_at is null or l.expires_at >= now())
    and (
      l.creator_id = c.uid
      or exists (
        select 1 from public.loop_members lm
        where lm.loop_id = l.id and lm.user_id = c.uid
      )
    )
    -- Unread gate: at least one message written by someone else (or a NULL-user
    -- system notice) after the caller's last read mark. No creator bypass here —
    -- a fully-read ride must disappear from the badge set, creator or not.
    and exists (
      select 1 from public.messages m
      where m.loop_id = l.id
        and m.created_at > coalesce(
          (select rs.last_read_at
           from public.chat_read_state rs
           where rs.user_id = c.uid and rs.loop_id = l.id),
          '-infinity'::timestamptz
        )
        and (m.user_id is null or m.user_id <> c.uid)
    )
  order by l.id
$$;

revoke all on function public.get_unread_loop_ids() from public;
revoke all on function public.get_unread_loop_ids() from anon;
grant execute on function public.get_unread_loop_ids() to authenticated;

notify pgrst, 'reload schema';
