-- ==============================================================================
-- Schema Initialization for Live Database Contract Tests
-- Reproduces the 10 production tables, constraints, foreign keys, RLS, and policies
-- ==============================================================================

-- 1. Create auth schema and auth.uid() function for RLS evaluation
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT '00000000-0000-0000-0000-000000000000'::uuid;
$$;

-- 2. Drop existing public tables if re-running
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.loop_members CASCADE;
DROP TABLE IF EXISTS public.loop_participants CASCADE;
DROP TABLE IF EXISTS public.loops CASCADE;
DROP TABLE IF EXISTS public.expected_fares CASCADE;
DROP TABLE IF EXISTS public.trusted_vehicles CASCADE;
DROP TABLE IF EXISTS public.emergency_contacts CASCADE;
DROP TABLE IF EXISTS public.profile_contacts CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.allowed_external_emails CASCADE;

-- 3. Create the 10 canonical tables
CREATE TABLE public.allowed_external_emails (
  email text PRIMARY KEY,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text NOT NULL,
  reg_no text,
  avatar_url text,
  gender text DEFAULT 'unspecified',
  bio text,
  is_student_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.profile_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_info text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  relation text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.trusted_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_type text NOT NULL,
  license_plate text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.loops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_point text NOT NULL,
  destination text NOT NULL,
  departure_time timestamptz NOT NULL,
  participants_limit integer NOT NULL DEFAULT 4,
  status text NOT NULL DEFAULT 'open',
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_female_only boolean DEFAULT false,
  is_driver_offering boolean DEFAULT false,
  vehicle_type text,
  total_fare numeric
);

CREATE TABLE public.loop_members (
  loop_id uuid NOT NULL REFERENCES public.loops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (loop_id, user_id)
);

CREATE TABLE public.loop_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id uuid REFERENCES public.loops(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now()
);

CREATE TABLE public.expected_fares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_location text NOT NULL,
  to_location text NOT NULL,
  expected_fare numeric NOT NULL,
  vehicle_type text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id uuid NOT NULL REFERENCES public.loops(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 4. Enable Row Level Security on ALL 10 tables
ALTER TABLE public.allowed_external_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expected_fares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loop_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loop_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_vehicles ENABLE ROW LEVEL SECURITY;

-- 5. Define RLS policies using initplan form (SELECT auth.uid()) for every table

-- allowed_external_emails
CREATE POLICY allowed_emails_select ON public.allowed_external_emails
  FOR SELECT TO authenticated USING (true);

-- profiles
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id);

-- profile_contacts
CREATE POLICY profile_contacts_all ON public.profile_contacts
  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id);

-- emergency_contacts
CREATE POLICY emergency_contacts_all ON public.emergency_contacts
  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id);

-- trusted_vehicles
CREATE POLICY trusted_vehicles_all ON public.trusted_vehicles
  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id);

-- loops
CREATE POLICY loops_select ON public.loops
  FOR SELECT TO authenticated
  USING (
    (is_female_only = false) 
    OR (is_female_only IS NULL) 
    OR (creator_id = (SELECT auth.uid())) 
    OR (EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = (SELECT auth.uid()) AND p.gender = 'female'
    ))
  );

CREATE POLICY loops_insert ON public.loops
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = creator_id);

CREATE POLICY loops_update ON public.loops
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = creator_id);

CREATE POLICY loops_delete ON public.loops
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = creator_id);

-- loop_members
CREATE POLICY members_select ON public.loop_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.loops l
      WHERE l.id = loop_members.loop_id
        AND (
          (l.is_female_only = false)
          OR (l.is_female_only IS NULL)
          OR (l.creator_id = (SELECT auth.uid()))
          OR (EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid()) AND p.gender = 'female'
          ))
          OR (loop_members.user_id = (SELECT auth.uid()))
        )
    )
  );

CREATE POLICY members_all ON public.loop_members
  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id);

-- loop_participants
CREATE POLICY participants_all ON public.loop_participants
  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id);

-- expected_fares
CREATE POLICY expected_fares_all ON public.expected_fares
  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id);

-- messages
CREATE POLICY messages_select ON public.messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.loop_members lm
      WHERE lm.loop_id = messages.loop_id AND lm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY messages_insert ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    (user_id IS NULL OR user_id = (SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.loop_members lm
      WHERE lm.loop_id = messages.loop_id AND lm.user_id = (SELECT auth.uid())
    )
  );
