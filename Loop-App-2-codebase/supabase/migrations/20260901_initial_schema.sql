-- ==============================================================================
-- LOOP Database Migration: 20260901_initial_schema.sql
-- Baseline initial schema defining core tables and Supabase runtime environment
-- ==============================================================================

-- 1. Setup Required Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Setup Supabase Auth Environment
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    CREATE ROLE postgres NOLOGIN;
  END IF;

  -- Grant role memberships to CURRENT_USER so test sessions can assume authenticated role
  EXECUTE format('GRANT anon, authenticated, service_role TO %I', CURRENT_USER);
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth.identities (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  identity_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), '')::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT coalesce(current_setting('request.jwt.claim.role', true), 'authenticated');
$$;

-- 3. Setup Supabase Storage Environment
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text,
  allowed_mime_types text[],
  file_size_limit bigint
);

INSERT INTO storage.buckets (id, name, allowed_mime_types)
VALUES ('avatars', 'avatars', ARRAY['image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id) ON DELETE CASCADE,
  name text,
  owner uuid,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION storage.extension(name text) RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT split_part(name, '.', array_length(string_to_array(name, '.'), 1));
$$;

-- 4. Setup pg_cron Stubs for Local / CI Compatibility
CREATE SCHEMA IF NOT EXISTS cron;

CREATE OR REPLACE FUNCTION cron.schedule(job_name text, schedule text, command text)
RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint; $$;

CREATE OR REPLACE FUNCTION cron.unschedule(job_name text)
RETURNS void LANGUAGE sql AS $$ SELECT; $$;

-- 5. Baseline Core Application Tables
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  theme text DEFAULT 'dark',
  updated_at timestamptz NOT NULL DEFAULT now(),
  gender text DEFAULT 'unspecified',
  reg_no text,
  avatar_url text,
  bio text DEFAULT '',
  phone_number text,
  is_student_verified boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.loops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid CONSTRAINT fk_loops_creator_id REFERENCES public.profiles(id) ON DELETE SET NULL,
  destination text NOT NULL,
  start_time_type text,
  participants_limit integer NOT NULL DEFAULT 4,
  gender_preference text NOT NULL DEFAULT 'any',
  purpose text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status text DEFAULT 'active',
  is_female_only boolean DEFAULT false,
  departure_time timestamptz,
  category text DEFAULT 'Other',
  start_point text,
  total_fare integer,
  is_driver_offering boolean DEFAULT false,
  vehicle_type text
);

CREATE TABLE IF NOT EXISTS public.loop_members (
  loop_id uuid NOT NULL REFERENCES public.loops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL CONSTRAINT fk_loop_members_user_id REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (loop_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.loop_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id uuid REFERENCES public.loops(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  CONSTRAINT loop_participants_loop_id_user_id_key UNIQUE (loop_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.expected_fares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_location text NOT NULL,
  to_location text NOT NULL,
  expected_fare numeric NOT NULL,
  vehicle_type text DEFAULT 'auto',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trusted_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_name text NOT NULL,
  phone_number text NOT NULL,
  vehicle_type text NOT NULL CONSTRAINT trusted_vehicles_vehicle_type_check CHECK (vehicle_type IN ('bike', 'auto', 'share_auto')),
  created_at timestamptz DEFAULT now(),
  from_location text,
  to_location text,
  expected_fare numeric
);


CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id uuid REFERENCES public.loops(id) ON DELETE CASCADE,
  user_id uuid CONSTRAINT fk_messages_profiles REFERENCES public.profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  edited_at timestamptz,
  reactions jsonb DEFAULT '{}'::jsonb
);

-- Enable Row Level Security (RLS) on all baseline public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loop_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loop_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expected_fares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- Maintenance function declarations
CREATE OR REPLACE FUNCTION public.purge_old_data() RETURNS void LANGUAGE sql AS $$ SELECT; $$;
CREATE OR REPLACE FUNCTION public.expire_old_loops() RETURNS void LANGUAGE sql AS $$ SELECT; $$;
CREATE OR REPLACE FUNCTION public.delete_loop(loop_id uuid) RETURNS void LANGUAGE sql AS $$ DELETE FROM public.loops WHERE id = loop_id; $$;

