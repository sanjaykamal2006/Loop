-- Automatic cleanup of old rides (Free tier optimization)
-- This function deletes rides older than 7 days to reduce database storage

-- Function to clean up old rides
CREATE OR REPLACE FUNCTION cleanup_old_rides()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete messages from rides older than 7 days
  DELETE FROM public.messages
  WHERE loop_id IN (
    SELECT id FROM public.loops
    WHERE departure_time < NOW() - INTERVAL '7 days'
  );

  -- Delete loop members from rides older than 7 days
  DELETE FROM public.loop_members
  WHERE loop_id IN (
    SELECT id FROM public.loops
    WHERE departure_time < NOW() - INTERVAL '7 days'
  );

  -- Delete the rides themselves
  DELETE FROM public.loops
  WHERE departure_time < NOW() - INTERVAL '7 days';

  RAISE NOTICE 'Old rides cleanup completed';
END;
$$;

-- Security hardening: restrict execution strictly to service_role (called by /api/cleanup with secret token)
REVOKE EXECUTE ON FUNCTION cleanup_old_rides() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION cleanup_old_rides() FROM anon;
REVOKE EXECUTE ON FUNCTION cleanup_old_rides() FROM authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_rides() TO service_role;
