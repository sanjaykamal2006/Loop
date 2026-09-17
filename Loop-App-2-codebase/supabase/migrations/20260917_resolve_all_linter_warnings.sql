-- ==============================================================================
-- Migration: 20260917_resolve_all_linter_warnings.sql
-- Description:
--   Resolves all 13 Supabase Security Linter warnings:
--   1. Fix public_bucket_allows_listing: Drop broad SELECT on avatars storage.objects
--      (Public buckets serve assets via CDN URL without needing broad table listing).
--   2. Fix anon & authenticated security_definer_function_executable on triggers:
--      Revoke direct RPC EXECUTE on trigger functions (triggers fire internally).
--   3. Fix authenticated_security_definer_function_executable on get_loop_contacts:
--      Switch get_loop_contacts to SECURITY INVOKER and allow confirmed ride
--      co-members to read profile_contacts via RLS.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Fix public_bucket_allows_listing on avatars storage bucket
-- ------------------------------------------------------------------------------
-- Public buckets serve files directly via public CDN URL (/storage/v1/object/public/avatars/...)
-- Removing the broad SELECT policy prevents attackers from enumerating/listing all files in the bucket.
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars." ON storage.objects;

-- ------------------------------------------------------------------------------
-- 2. Revoke direct RPC execution on internal TRIGGER functions
-- ------------------------------------------------------------------------------
-- These functions return trigger and are only executed by table triggers, never via HTTP RPC.
REVOKE EXECUTE ON FUNCTION public.check_active_loops_quota() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_emergency_contacts_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_loop_capacity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_message_updates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_updates() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 3. Resolve SECURITY DEFINER warning on get_loop_contacts
-- ------------------------------------------------------------------------------
-- A. Update profile_contacts RLS so confirmed ride co-passengers can select phone numbers
DROP POLICY IF EXISTS profile_contacts_select ON public.profile_contacts;

CREATE POLICY profile_contacts_select ON public.profile_contacts
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.loop_members lm1
      JOIN public.loop_members lm2 ON lm1.loop_id = lm2.loop_id
      WHERE lm1.user_id = (select auth.uid())
        AND lm2.user_id = profile_contacts.user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.loops l
      WHERE (l.creator_id = (select auth.uid()) AND EXISTS (SELECT 1 FROM public.loop_members lm WHERE lm.loop_id = l.id AND lm.user_id = profile_contacts.user_id))
         OR (l.creator_id = profile_contacts.user_id AND EXISTS (SELECT 1 FROM public.loop_members lm WHERE lm.loop_id = l.id AND lm.user_id = (select auth.uid())))
    )
  );

-- B. Convert get_loop_contacts to SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.get_loop_contacts(target_loop_id uuid)
RETURNS TABLE (
  user_id uuid,
  phone_number text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
BEGIN
  -- Check if caller is authenticated
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  -- Check if caller is either the loop creator or a member of the target loop
  IF NOT EXISTS (
    SELECT 1 FROM public.loops l
    WHERE l.id = target_loop_id
      AND (
        l.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.loop_members lm
          WHERE lm.loop_id = target_loop_id AND lm.user_id = auth.uid()
        )
      )
  ) THEN
    RETURN; -- Caller is not part of this ride! Return empty set.
  END IF;

  -- Return contact numbers for all confirmed members of this loop and creator
  RETURN QUERY
  SELECT pc.user_id, pc.phone_number
  FROM public.profile_contacts pc
  WHERE pc.user_id IN (
    SELECT lm.user_id FROM public.loop_members lm WHERE lm.loop_id = target_loop_id
    UNION
    SELECT l.creator_id FROM public.loops l WHERE l.id = target_loop_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_loop_contacts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_loop_contacts(uuid) TO authenticated, service_role;
