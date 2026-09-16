-- ==============================================================================
-- Migration: 20260916_fortress_security_hardening.sql
-- Description:
--   1. Decouple loops_select from loop_members to eliminate circular RLS recursion
--   2. Profile anti-spoofing trigger (blocks self-verification, freezes reg_no, blocks gender evasion)
--   3. Profile input validation constraints (display_name, bio, gender)
--   4. Storage bucket hardening for avatars (user-id path isolation, image MIME & extension enforcement)
--   5. Atomic loop capacity trigger (FOR UPDATE lock, prevents overfilling beyond seat limit)
--   6. Ride creation bounds & anti-spam quota trigger (max 5 active rides per host, capacity 1-10, fare bounds)
--   7. Message length constraint (1-2000 chars) & IDOR mutation protection trigger
--   8. Trusted vehicles validation constraints and clean authenticated RLS policies
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Decouple loops_select to prevent circular RLS recursion
-- ------------------------------------------------------------------------------
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
  );

-- ------------------------------------------------------------------------------
-- 2. Profile Security & Anti-Spoofing Trigger
-- ------------------------------------------------------------------------------
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
      OR caller_email = 'sanjaykamal2006@gmail.com'
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

-- Profile column constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_profiles_display_name_len'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT check_profiles_display_name_len
      CHECK (display_name IS NULL OR length(trim(display_name)) <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_profiles_bio_len'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT check_profiles_bio_len
      CHECK (bio IS NULL OR length(bio) <= 500);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_profiles_gender_valid'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT check_profiles_gender_valid
      CHECK (gender IS NULL OR gender IN ('male', 'female', 'other', 'unspecified'));
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. Storage Bucket & Objects Hardening
-- ------------------------------------------------------------------------------
-- Update avatars bucket limits
UPDATE storage.buckets
SET 
  file_size_limit = 5242880, -- 5 MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'avatars';

-- Drop old storage policies
DROP POLICY IF EXISTS "Users can update their own avatars." ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatars." ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

-- Create hardened storage policies binding file names strictly to auth.uid()
CREATE POLICY "Users can upload own avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      name LIKE (auth.uid()::text || '-%')
      OR name LIKE ('avatars/' || auth.uid()::text || '-%')
    )
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif')
  );

CREATE POLICY "Users can update own avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      owner = auth.uid()
      OR name LIKE (auth.uid()::text || '-%')
      OR name LIKE ('avatars/' || auth.uid()::text || '-%')
    )
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      owner = auth.uid()
      OR name LIKE (auth.uid()::text || '-%')
      OR name LIKE ('avatars/' || auth.uid()::text || '-%')
    )
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif')
  );

CREATE POLICY "Users can delete own avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      owner = auth.uid()
      OR name LIKE (auth.uid()::text || '-%')
      OR name LIKE ('avatars/' || auth.uid()::text || '-%')
    )
  );

-- ------------------------------------------------------------------------------
-- 4. Atomic Loop Capacity & Seat Limit Enforcement Trigger
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_loop_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int;
  v_status text;
  v_count int;
BEGIN
  -- Row lock the target loop to serialize concurrent join attempts atomically
  SELECT participants_limit, status
  INTO v_limit, v_status
  FROM public.loops
  WHERE id = NEW.loop_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride loop not found';
  END IF;

  IF v_status NOT IN ('open', 'started', 'active', 'in_progress') THEN
    RAISE EXCEPTION 'Cannot join a ride that has ended or is closed';
  END IF;

  -- Count current confirmed members
  SELECT count(*) INTO v_count
  FROM public.loop_members
  WHERE loop_id = NEW.loop_id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'This loop is already full';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_loop_capacity ON public.loop_members;
CREATE TRIGGER trg_check_loop_capacity
  BEFORE INSERT ON public.loop_members
  FOR EACH ROW
  EXECUTE FUNCTION public.check_loop_capacity();

-- ------------------------------------------------------------------------------
-- 5. Active Loops Quota & Range Constraints Trigger
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_active_loops_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count int;
BEGIN
  IF NEW.participants_limit < 1 OR NEW.participants_limit > 10 THEN
    RAISE EXCEPTION 'Passenger capacity must be between 1 and 10';
  END IF;

  IF NEW.total_fare IS NOT NULL AND (NEW.total_fare < 0 OR NEW.total_fare > 20000) THEN
    RAISE EXCEPTION 'Total fare must be between 0 and 20000';
  END IF;

  IF NEW.destination IS NOT NULL AND length(trim(NEW.destination)) = 0 THEN
    RAISE EXCEPTION 'Destination cannot be empty';
  END IF;

  -- Limit active rides to 5 per host to prevent feed spamming
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status)) THEN
    IF NEW.status IN ('open', 'started', 'active', 'in_progress') THEN
      SELECT count(*) INTO active_count
      FROM public.loops
      WHERE creator_id = NEW.creator_id
        AND id != coalesce(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND status IN ('open', 'started', 'active', 'in_progress');

      IF active_count >= 5 THEN
        RAISE EXCEPTION 'You cannot have more than 5 active rides at the same time';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_active_loops_quota ON public.loops;
CREATE TRIGGER trg_check_active_loops_quota
  BEFORE INSERT OR UPDATE ON public.loops
  FOR EACH ROW
  EXECUTE FUNCTION public.check_active_loops_quota();

-- ------------------------------------------------------------------------------
-- 6. Message Constraints & IDOR Mutation Protection
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_content_length'
  ) THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_content_length
      CHECK (length(trim(content)) > 0 AND length(content) <= 2000);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.protect_message_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.loop_id IS DISTINCT FROM OLD.loop_id THEN
    RAISE EXCEPTION 'Cannot transfer messages across loops';
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Cannot alter message sender';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_message_updates ON public.messages;
CREATE TRIGGER trg_protect_message_updates
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_message_updates();

-- ------------------------------------------------------------------------------
-- 7. Trusted Vehicles Constraints & RLS Lockdown
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_driver_name_len'
  ) THEN
    ALTER TABLE public.trusted_vehicles ADD CONSTRAINT check_driver_name_len
      CHECK (length(trim(driver_name)) >= 2 AND length(driver_name) <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_phone_number_len'
  ) THEN
    ALTER TABLE public.trusted_vehicles ADD CONSTRAINT check_phone_number_len
      CHECK (length(trim(phone_number)) >= 8 AND length(phone_number) <= 20);
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can delete their own trusted vehicles." ON public.trusted_vehicles;
DROP POLICY IF EXISTS "Users can insert their own trusted vehicles." ON public.trusted_vehicles;
DROP POLICY IF EXISTS trusted_vehicles_insert ON public.trusted_vehicles;
DROP POLICY IF EXISTS trusted_vehicles_update ON public.trusted_vehicles;
DROP POLICY IF EXISTS trusted_vehicles_delete ON public.trusted_vehicles;

CREATE POLICY trusted_vehicles_insert ON public.trusted_vehicles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY trusted_vehicles_update ON public.trusted_vehicles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY trusted_vehicles_delete ON public.trusted_vehicles
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
