-- Migration: Auto-cleanup unconfirmed users older than 5 minutes
-- Created: 2026-09-15

CREATE OR REPLACE FUNCTION public.cleanup_unconfirmed_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- 1. Delete associated identities for unconfirmed users older than 5 minutes
  DELETE FROM auth.identities
  WHERE user_id IN (
    SELECT id FROM auth.users
    WHERE email_confirmed_at IS NULL
      AND created_at < (NOW() - INTERVAL '5 minutes')
  );

  -- 2. Delete any orphaned profiles if created
  DELETE FROM public.profiles
  WHERE id IN (
    SELECT id FROM auth.users
    WHERE email_confirmed_at IS NULL
      AND created_at < (NOW() - INTERVAL '5 minutes')
  );

  -- 3. Delete unconfirmed users older than 5 minutes
  DELETE FROM auth.users
  WHERE email_confirmed_at IS NULL
    AND created_at < (NOW() - INTERVAL '5 minutes');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % unconfirmed users older than 5 minutes', deleted_count;
END;
$$;

-- Schedule job via pg_cron to run every 5 minutes
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-unconfirmed-users-job');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'cleanup-unconfirmed-users-job',
  '*/5 * * * *',
  'SELECT public.cleanup_unconfirmed_users()'
);
