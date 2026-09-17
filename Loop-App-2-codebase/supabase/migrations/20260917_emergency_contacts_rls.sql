-- ==============================================================================
-- Migration: 20260917_emergency_contacts_rls.sql
-- Description:
--   1. Create public.emergency_contacts table with CASCADE delete on user deletion
--   2. Enforce Row Level Security (RLS) on public.emergency_contacts
--   3. Create strict RLS policies ensuring users can ONLY access their own emergency contacts
--   4. Add input validation constraints (name, phone length)
--   5. Add trigger to enforce maximum limit of 3 emergency contacts per user
--   6. Create index on foreign key user_id for high-performance lookups
-- ==============================================================================

-- 1. Create emergency_contacts table
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  relation text DEFAULT 'Parent',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Performance index on user_id foreign key
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON public.emergency_contacts(user_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- 4. Profile & Phone constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_emergency_contact_name_len'
  ) THEN
    ALTER TABLE public.emergency_contacts ADD CONSTRAINT check_emergency_contact_name_len
      CHECK (length(trim(name)) >= 1 AND length(name) <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_emergency_contact_phone_len'
  ) THEN
    ALTER TABLE public.emergency_contacts ADD CONSTRAINT check_emergency_contact_phone_len
      CHECK (length(trim(phone)) >= 10 AND length(phone) <= 15);
  END IF;
END $$;

-- 5. Trigger to enforce maximum limit of 3 emergency contacts per user
CREATE OR REPLACE FUNCTION public.check_emergency_contacts_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT count(*) INTO current_count
    FROM public.emergency_contacts
    WHERE user_id = NEW.user_id;

    IF current_count >= 3 THEN
      RAISE EXCEPTION 'A user cannot have more than 3 emergency contacts';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_emergency_contacts_limit ON public.emergency_contacts;
CREATE TRIGGER trg_check_emergency_contacts_limit
  BEFORE INSERT ON public.emergency_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_emergency_contacts_limit();

-- 6. Strict RLS Policies (Optimized with (select auth.uid()) for Supabase auth_rls_initplan)
DROP POLICY IF EXISTS "emergency_contacts_select" ON public.emergency_contacts;
DROP POLICY IF EXISTS "emergency_contacts_insert" ON public.emergency_contacts;
DROP POLICY IF EXISTS "emergency_contacts_update" ON public.emergency_contacts;
DROP POLICY IF EXISTS "emergency_contacts_delete" ON public.emergency_contacts;

-- SELECT: Authenticated users can ONLY view their own emergency contacts
CREATE POLICY "emergency_contacts_select" ON public.emergency_contacts
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- INSERT: Authenticated users can ONLY insert contacts for themselves
CREATE POLICY "emergency_contacts_insert" ON public.emergency_contacts
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- UPDATE: Authenticated users can ONLY update their own emergency contacts
CREATE POLICY "emergency_contacts_update" ON public.emergency_contacts
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- DELETE: Authenticated users can ONLY delete their own emergency contacts
CREATE POLICY "emergency_contacts_delete" ON public.emergency_contacts
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);
