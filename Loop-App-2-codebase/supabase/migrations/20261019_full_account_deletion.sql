-- ==============================================================================
-- 20261019_full_account_deletion.sql
-- True erasure: avatars + chat content are removed alongside profiles/auth rows.
-- Invoke via:  select public.tools_delete_user_assets('<uuid>');
-- ==============================================================================

-- 1. Avatar storage removal: BEFORE DELETE on profiles (so OLD.id path is known)
CREATE OR REPLACE FUNCTION public.delete_user_avatars()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  avatar_rec record;
BEGIN
  FOR avatar_rec IN
    SELECT name
    FROM storage.objects
    WHERE bucket_id = 'avatars'
      -- portable prefix match; storage.foldername() is not guaranteed on
      -- self-hosted / contract-test databases
      AND name LIKE OLD.id::text || '/%'
  LOOP
    DELETE FROM storage.objects
    WHERE bucket_id = 'avatars' AND name = avatar_rec.name;
  END LOOP;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_user_avatars ON public.profiles CASCADE;
CREATE TRIGGER trg_delete_user_avatars
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.delete_user_avatars();

-- 2. Chat content removal: on profile delete, scrub every message body.
--    Row is kept for ride context; body is replaced with an anonymised copy.
CREATE OR REPLACE FUNCTION public.scrub_user_message_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.messages
  SET content = '[Message removed: account deleted]'
  WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_scrub_user_message_content ON public.profiles CASCADE;
CREATE TRIGGER trg_scrub_user_message_content
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.scrub_user_message_content();

-- 3. Privileged no-service wrapper so a Next.js service-call can erase all
--    user-owned assets atomically BEFORE the users row is removed.
CREATE OR REPLACE FUNCTION public.tools_delete_user_assets(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avatar_rec record;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user id required';
  END IF;

  -- Storage avatars
  FOR avatar_rec IN
    SELECT name FROM storage.objects
    WHERE bucket_id = 'avatars'
      -- portable prefix match (same rationale as the trigger)
      AND name LIKE p_user_id::text || '/%'
  LOOP
    DELETE FROM storage.objects WHERE bucket_id='avatars' AND name=avatar_rec.name;
  END LOOP;

  -- Chat history belonging to the user
  UPDATE public.messages
  SET content = '[Message removed: account deleted]'
  WHERE user_id = p_user_id;
END;
$$;

-- Lockdown: only the service runner may invoke these directly.
GRANT EXECUTE ON FUNCTION public.tools_delete_user_assets(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.tools_delete_user_assets(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_avatars() TO service_role;
REVOKE EXECUTE ON FUNCTION public.delete_user_avatars() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scrub_user_message_content() TO service_role;
REVOKE EXECUTE ON FUNCTION public.scrub_user_message_content() FROM PUBLIC, anon, authenticated;
