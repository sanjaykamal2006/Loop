-- ==============================================================================
-- 20261031_ride_intent_undo_guard.sql
-- Feature: undo (misclick protection) for ride wants — guarded.
--
-- Rule: a student may remove their own want ONLY while nobody else has joined
-- their destination+date group. Once any friend joined (group size >= 2, caller
-- excluded), undo raises loudly: the matched pair coordinates through the ride
-- they eventually create, not by silently vanishing rows. This closes the
-- founder-flagged blunder: the original poster (or any member) undoing a
-- demand others already joined would strand them with a silently mutating
-- count and no notification.
--
-- The table-level owner DELETE (ride_intents_owner_all) stays — security-wise
-- it is unchanged ownership semantics — but the app now goes through this RPC
-- so product rules are enforced server-side, not just in one client.
-- ==============================================================================

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
  v_others integer;
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

  -- Undo guard: any OTHER live member of this group closes the door.
  select count(*) into v_others
  from public.ride_intents
  where destination_key = v_clean
    and depart_date = p_depart_date
    and user_id <> v_caller_id
    and expires_at >= now();

  if v_others > 0 then
    raise exception 'A friend already joined this plan — undo is disabled';
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
