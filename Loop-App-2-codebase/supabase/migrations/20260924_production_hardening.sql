-- ==============================================================================
-- Migration: 20260924_production_hardening.sql
-- Description:
--   1. Ensure stable named foreign key constraints (fk_loops_creator_id, fk_messages_profiles)
--   2. Add lightweight public.health_check() RPC for safe database ping
--   3. Add public.count_external_users() RPC for efficient quota validation
--   4. Update protect_profile_updates() trigger to remove hardcoded personal email
-- ==============================================================================

-- 1. Stable Named Foreign Key Constraints for PostgREST
DO $$
BEGIN
  -- Ensure loops.creator_id is nullable and uses ON DELETE SET NULL
  ALTER TABLE public.loops ALTER COLUMN creator_id DROP NOT NULL;

  ALTER TABLE public.loops DROP CONSTRAINT IF EXISTS fk_loops_creator_id;
  ALTER TABLE public.loops
    ADD CONSTRAINT fk_loops_creator_id
    FOREIGN KEY (creator_id) REFERENCES public.profiles(id)
    ON DELETE SET NULL;

  -- Ensure fk_messages_profiles exists on public.messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_messages_profiles'
  ) THEN
    BEGIN
      ALTER TABLE public.messages
        ADD CONSTRAINT fk_messages_profiles
        FOREIGN KEY (user_id) REFERENCES public.profiles(id)
        ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;

-- 2. Lightweight Server/Client Health Check RPC
-- Returns zero user/ride data, purely validates DB connectivity and function execution
CREATE OR REPLACE FUNCTION public.health_check()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'status', 'healthy',
    'timestamp', now()
  );
$$;

-- Allow execution by all roles (health check exposes no sensitive data)
GRANT EXECUTE ON FUNCTION public.health_check() TO anon, authenticated, service_role;

-- 3. Efficient External User Quota Count RPC (Service Role only)
CREATE OR REPLACE FUNCTION public.count_external_users()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  ext_count integer;
BEGIN
  SELECT count(*)::integer INTO ext_count
  FROM auth.users u
  WHERE lower(coalesce(u.email, '')) NOT LIKE '%@vitapstudent.ac.in'
    AND lower(coalesce(u.email, '')) NOT LIKE '%@vitap.ac.in'
    AND lower(coalesce(u.email, '')) NOT LIKE '%.ac.in'
    AND lower(coalesce(u.email, '')) NOT LIKE '%.edu.in'
    AND lower(coalesce(u.email, '')) NOT LIKE '%.edu';
  RETURN ext_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.count_external_users() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_external_users() TO service_role;

-- 4. Update Profile Protection Trigger (Remove Hardcoded Personal Email)
CREATE OR REPLACE FUNCTION public.protect_profile_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_email text;
  is_valid_student boolean;
  active_female_rides int;
BEGIN
  -- 1. Enforce student verification integrity
  -- Users cannot claim is_student_verified unless their auth email is an authorized educational domain
  IF NEW.is_student_verified = true THEN
    SELECT email INTO caller_email FROM auth.users WHERE id = NEW.id;
    caller_email := lower(coalesce(caller_email, ''));

    is_valid_student := (
      caller_email LIKE '%@vitapstudent.ac.in'
      OR caller_email LIKE '%@vitap.ac.in'
      OR caller_email LIKE '%.ac.in'
      OR caller_email LIKE '%.edu.in'
      OR caller_email LIKE '%.edu'
    );

    IF NOT is_valid_student THEN
      NEW.is_student_verified := false;
    END IF;
  END IF;

  -- 2. Lock registration number once verified
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_student_verified = true AND OLD.reg_no IS NOT NULL AND length(trim(OLD.reg_no)) > 0 THEN
      IF NEW.reg_no IS DISTINCT FROM OLD.reg_no THEN
        RAISE EXCEPTION 'Verified student registration numbers cannot be modified';
      END IF;
    END IF;

    -- 3. Prevent changing gender away from female while actively in a female-only ride
    IF OLD.gender = 'female' AND NEW.gender IS DISTINCT FROM 'female' THEN
      SELECT count(*) INTO active_female_rides
      FROM public.loops l
      WHERE l.is_female_only = true
        AND l.status IN ('open', 'started', 'active', 'in_progress')
        AND (
          l.creator_id = NEW.id
          OR EXISTS (
            SELECT 1 FROM public.loop_members lm
            WHERE lm.loop_id = l.id AND lm.user_id = NEW.id
          )
        );

      IF active_female_rides > 0 THEN
        RAISE EXCEPTION 'Cannot change gender while actively hosting or participating in a female-only ride';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_updates ON public.profiles;
CREATE TRIGGER trg_protect_profile_updates
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_updates();

-- 5. Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
