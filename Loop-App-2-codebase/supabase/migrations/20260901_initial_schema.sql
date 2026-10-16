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
END $$;

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
  display_name text NOT NULL,
  phone_number text,
  reg_no text,
  avatar_url text,
  gender text DEFAULT 'unspecified',
  bio text,
  theme text DEFAULT 'dark',
  is_student_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loops (
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
  total_fare numeric,
  category text,
  purpose text,
  gender_preference text DEFAULT 'any',
  start_time_type text
);

CREATE TABLE IF NOT EXISTS public.loop_members (
  loop_id uuid NOT NULL REFERENCES public.loops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (loop_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.loop_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id uuid REFERENCES public.loops(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expected_fares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_location text NOT NULL,
  to_location text NOT NULL,
  expected_fare numeric NOT NULL,
  vehicle_type text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trusted_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_name text NOT NULL DEFAULT '',
  phone_number text NOT NULL DEFAULT '',
  vehicle_type text NOT NULL,
  expected_fare numeric,
  from_location text,
  to_location text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id uuid NOT NULL REFERENCES public.loops(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id),
  content text NOT NULL,
  reactions jsonb DEFAULT '{}'::jsonb,
  edited_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS) on all baseline public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loop_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loop_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expected_fares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Maintenance function declarations
CREATE OR REPLACE FUNCTION public.purge_old_data() RETURNS void LANGUAGE sql AS $$ SELECT; $$;
CREATE OR REPLACE FUNCTION public.expire_old_loops() RETURNS void LANGUAGE sql AS $$ SELECT; $$;
CREATE OR REPLACE FUNCTION public.delete_loop(loop_id uuid) RETURNS void LANGUAGE sql AS $$ DELETE FROM public.loops WHERE id = loop_id; $$;

