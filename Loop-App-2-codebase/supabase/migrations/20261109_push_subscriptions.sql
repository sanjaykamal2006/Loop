-- ==============================================================================
-- 20261109_push_subscriptions.sql
-- Real Web Push Notifications subscription registry.
-- Stores browser Web Push endpoints and VAPID public encryption keys per user.
-- Enables background ride updates (passenger joined, departure alerts, chat).
-- ==============================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'push_subscriptions'
      and policyname = 'push_subscriptions_owner_all'
  ) then
    create policy push_subscriptions_owner_all on public.push_subscriptions
      for all
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end $$;

revoke all on public.push_subscriptions from anon, public;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);
