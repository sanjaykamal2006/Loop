-- ==============================================================================
-- Migration: 20260916_security_hardening.sql
-- Description: 
--   1. Revoke public/anon/authenticated execution on cleanup_unconfirmed_users RPC
--   2. Isolate phone numbers into private public.profile_contacts table with RLS
--   3. Create secure get_loop_contacts() RPC for verified ride co-passengers
--   4. Null out profiles.phone_number to prevent directory scraping
--   5. Enforce female-only loops privacy at database level on loops and loop_members
--   6. Fully lock down deprecated loop_participants table
--   7. Restrict messages_update to authenticated role
-- ==============================================================================

-- 1. Revoke public/anon/authenticated execution on cleanup_unconfirmed_users
REVOKE EXECUTE ON FUNCTION public.cleanup_unconfirmed_users() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_unconfirmed_users() TO service_role;

-- 2. Create public.profile_contacts table
CREATE TABLE IF NOT EXISTS public.profile_contacts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Copy existing phone numbers from profiles into profile_contacts
INSERT INTO public.profile_contacts (user_id, phone_number, updated_at)
SELECT id, phone_number, updated_at 
FROM public.profiles 
WHERE phone_number IS NOT NULL AND length(trim(phone_number)) > 0
ON CONFLICT (user_id) DO UPDATE 
SET phone_number = EXCLUDED.phone_number, updated_at = EXCLUDED.updated_at;

-- Wipe phone_number from profiles table so it cannot be scraped
UPDATE public.profiles SET phone_number = NULL;

-- Enable RLS on profile_contacts
ALTER TABLE public.profile_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_contacts_select ON public.profile_contacts;
DROP POLICY IF EXISTS profile_contacts_insert ON public.profile_contacts;
DROP POLICY IF EXISTS profile_contacts_update ON public.profile_contacts;
DROP POLICY IF EXISTS profile_contacts_delete ON public.profile_contacts;

-- Users can only select their own contact info directly from profile_contacts
CREATE POLICY profile_contacts_select ON public.profile_contacts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY profile_contacts_insert ON public.profile_contacts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY profile_contacts_update ON public.profile_contacts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY profile_contacts_delete ON public.profile_contacts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 3. Create secure RPC function to get co-passenger phone numbers in a ride
-- Only accessible if auth.uid() is the creator OR a confirmed member of that loop!
CREATE OR REPLACE FUNCTION public.get_loop_contacts(target_loop_id uuid)
RETURNS TABLE (
  user_id uuid,
  phone_number text
)
LANGUAGE plpgsql
SECURITY DEFINER
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

  -- Return contact numbers for all members of this loop and creator
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

-- 4. Harden loops_select policy with female-only check
DROP POLICY IF EXISTS loops_select ON public.loops;

CREATE POLICY loops_select ON public.loops
  FOR SELECT TO authenticated
  USING (
    is_female_only = false
    OR is_female_only IS NULL
    OR creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.gender = 'female'
    )
    OR EXISTS (
      SELECT 1 FROM public.loop_members lm
      WHERE lm.loop_id = loops.id AND lm.user_id = auth.uid()
    )
  );

-- 5. Harden loop_members select policy with female-only check
DROP POLICY IF EXISTS members_select ON public.loop_members;

CREATE POLICY members_select ON public.loop_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.loops l
      WHERE l.id = loop_members.loop_id
        AND (
          l.is_female_only = false
          OR l.is_female_only IS NULL
          OR l.creator_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.gender = 'female'
          )
          OR loop_members.user_id = auth.uid()
        )
    )
  );

-- 6. Lock down deprecated loop_participants table
DROP POLICY IF EXISTS "Users can insert their own participation" ON public.loop_participants;
DROP POLICY IF EXISTS "Users can delete their own participation" ON public.loop_participants;
DROP POLICY IF EXISTS loop_participants_select ON public.loop_participants;
DROP POLICY IF EXISTS loop_participants_insert ON public.loop_participants;
DROP POLICY IF EXISTS loop_participants_update ON public.loop_participants;
DROP POLICY IF EXISTS loop_participants_delete ON public.loop_participants;

CREATE POLICY loop_participants_select ON public.loop_participants
  FOR SELECT TO authenticated USING (false);

CREATE POLICY loop_participants_insert ON public.loop_participants
  FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY loop_participants_update ON public.loop_participants
  FOR UPDATE TO authenticated USING (false);

CREATE POLICY loop_participants_delete ON public.loop_participants
  FOR DELETE TO authenticated USING (false);

-- 7. Fix messages_update role from public to authenticated
DROP POLICY IF EXISTS messages_update ON public.messages;

CREATE POLICY messages_update ON public.messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
