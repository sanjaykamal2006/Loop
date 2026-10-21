-- ==============================================================================
-- 20261025_server_read_state.sql
-- Server-side chat read state: unread badges become cross-device and survive
-- local-storage wipes (previously the unread set only lived in localStorage).
--
--   chat_read_state(user_id, loop_id, last_read_at)
--   get_unread_loop_ids()  ->  the reconciled unread set for the caller
--
-- The RPC mirrors the client's badge rules exactly:
--   * participant loop (member rows; the auto_add_creator trigger guarantees
--     creators are members too, but creator_id is OR-ed in for safety),
--   * loop still reachable in the chat list: status open/started/active/
--     in_progress, departure no older than 2 hours, not expired,
--   * at least one message from someone else written after last_read_at
--     (system notices carry user_id NULL and count as unread),
--   * never includes the caller's own messages.
--
-- SECURITY INVOKER + pinned search_path: every probe below runs under the
-- caller's own RLS context. Stale local badges from ended/expired rides are
-- trimmed on the next reconciliation — the nav-dot and badge set finally agree.
-- ==============================================================================

create table if not exists public.chat_read_state (
  user_id uuid not null references public.profiles(id) on delete cascade,
  loop_id uuid not null references public.loops(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, loop_id)
);

alter table public.chat_read_state enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_read_state'
      and policyname = 'chat_read_state_owner_all'
  ) then
    create policy chat_read_state_owner_all on public.chat_read_state
      for all
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end $$;

revoke all on public.chat_read_state from anon, public;
grant select, insert, update, delete on public.chat_read_state to authenticated;

create index if not exists chat_read_state_loop_idx
  on public.chat_read_state (loop_id);

create or replace function public.get_unread_loop_ids()
returns table (loop_id uuid)
language sql
stable
security invoker
set search_path = public
as $$
  -- Resolve the caller WITHOUT touching the auth schema: SQL-language function
  -- bodies are name-resolved at call time under the caller's own privileges,
  -- so a bare auth.uid() here would fail for any role without USAGE on the
  -- auth schema. current_setting carries the same claim both locally and on
  -- Supabase, with auth.uid()'s zero-uuid fallback preserved.
  with caller as (
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), '')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid
    ) as uid
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

-- Least privilege: authenticated callers only.
revoke all on function public.get_unread_loop_ids() from public;
revoke all on function public.get_unread_loop_ids() from anon;
grant execute on function public.get_unread_loop_ids() to authenticated;

notify pgrst, 'reload schema';
