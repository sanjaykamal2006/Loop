-- Ride lifecycle completion + fair-use + privacy tightening.
--
-- 1. expire_old_loops() actually moves past rides to 'ended' (history works).
-- 2. purge_old_data() runs the expiry + the existing 7-day purge.
-- 3. delete_loop() becomes a soft-cancel that returns the cancelled row, so the
--    client can distinguish a real cancel from an RLS-rejected no-op (and never
--    silently falls back to a different code path). Host cancel keeps passenger
--    history (status 'cancelled'), replacing the old hard DELETE.
-- 4. get_expected_fares() exposes user_id only for the caller's OWN rows — the
--    community board stays usable but no longer leaks rider identities.
-- 5. can_view_profile() bounds the host-public branch to currently-live rides,
--    so past hosts stop being a permanent public directory.
-- 6. messages fair-use cap (30/min/account) mirroring the join/loop caps.
-- 7. pg_cron scheduling when the extension is available (guarded). GitHub
--    Actions calling /api/cleanup is the documented fallback.

-- 1. Real ride expiry ----------------------------------------------------------------
DROP FUNCTION IF EXISTS public.expire_old_loops();
CREATE FUNCTION public.expire_old_loops()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ended_count integer;
BEGIN
  UPDATE public.loops
     SET status = 'ended'
   WHERE status IN ('open', 'started', 'active', 'in_progress')
     AND expires_at < now();
  GET DIAGNOSTICS ended_count = ROW_COUNT;
  RETURN ended_count;
END;
$$;
REVOKE ALL ON FUNCTION public.expire_old_loops() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_old_loops() TO service_role;

-- 2. Master maintenance entry point (called by cron / /api/cleanup) -------------------
CREATE OR REPLACE FUNCTION public.purge_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.expire_old_loops();
  PERFORM public.cleanup_old_rides();
END;
$$;
REVOKE ALL ON FUNCTION public.purge_old_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_old_data() TO service_role;

-- 3. delete_loop: soft-cancel with an honest result ----------------------------------
DROP FUNCTION IF EXISTS public.delete_loop(uuid);
CREATE FUNCTION public.delete_loop(loop_id uuid)
RETURNS TABLE (cancelled_id uuid, new_status text)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.loops
     SET status = 'cancelled'
   WHERE id = loop_id
  RETURNING loops.id, loops.status;
$$;
REVOKE ALL ON FUNCTION public.delete_loop(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_loop(uuid) TO authenticated, service_role;

-- 4. Fare board: caller-scoped user_id -----------------------------------------------
CREATE OR REPLACE FUNCTION public.get_expected_fares()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  from_location text,
  to_location text,
  expected_fare numeric,
  vehicle_type text,
  created_at timestamptz,
  display_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id,
    CASE WHEN f.user_id = (SELECT auth.uid()) THEN f.user_id ELSE NULL::uuid END AS user_id,
    f.from_location,
    f.to_location,
    f.expected_fare,
    f.vehicle_type,
    f.created_at,
    p.display_name,
    p.avatar_url
  FROM public.expected_fares f
  LEFT JOIN public.profiles p ON p.id = f.user_id
  ORDER BY f.created_at DESC;
$$;

-- 5. can_view_profile: host branch bounded to live rides ------------------------------
CREATE OR REPLACE FUNCTION public.can_view_profile(target_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    target_user = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.loop_members me
      JOIN public.loop_members them ON them.loop_id = me.loop_id
      WHERE me.user_id = (SELECT auth.uid())
        AND them.user_id = target_user
    )
    OR EXISTS (
      SELECT 1 FROM public.loops l
      WHERE l.creator_id = target_user
        AND l.expires_at > now()
    );
$$;

-- 6. Messages fair-use cap -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_message_rate_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT count(*) FROM public.messages
    WHERE user_id = NEW.user_id
      AND created_at > now() - interval '60 seconds'
  ) >= 30 THEN
    RAISE EXCEPTION 'Sending too fast — take a breath and try again shortly.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_message_rate_cap ON public.messages;
CREATE TRIGGER trg_message_rate_cap
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_message_rate_cap();

REVOKE EXECUTE ON FUNCTION public.enforce_message_rate_cap()
  FROM PUBLIC, anon, authenticated;

-- 7. Cron scheduling (optional — plain Postgres/CI simply skips this block) -----------
DO $outer$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'loop-expire-rides') THEN
      PERFORM cron.schedule('loop-expire-rides', '*/15 * * * *', 'select public.expire_old_loops()');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'loop-purge-old') THEN
      PERFORM cron.schedule('loop-purge-old', '33 3 * * *', 'select public.purge_old_data()');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'cron.schedule unavailable: % (GitHub Action fallback applies)', SQLERRM;
  END;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron extension unavailable; skipping schedule (GitHub Action fallback applies)';
END
$outer$;

NOTIFY pgrst, 'reload schema';
