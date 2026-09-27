-- ==============================================================================
-- Migration: 20260927_dynamic_external_whitelist_table.sql
-- Description:
--   1. Create public.allowed_external_emails table for dynamic whitelist management.
--   2. Seed with founder email 'sanjaykamal2006@gmail.com'.
--   3. Secure with Row Level Security (RLS).
--   4. Update public.check_auth_user_email_domain() trigger to dynamically read
--      from public.allowed_external_emails table instead of hardcoding outside emails.
-- ==============================================================================

-- 1. Create table for allowed external emails
CREATE TABLE IF NOT EXISTS public.allowed_external_emails (
  email text PRIMARY KEY,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Ensure emails are always stored lowercase and trimmed
ALTER TABLE public.allowed_external_emails DROP CONSTRAINT IF EXISTS check_email_clean;
ALTER TABLE public.allowed_external_emails ADD CONSTRAINT check_email_clean
  CHECK (email = lower(trim(email)) AND email LIKE '%@%');

-- 2. Seed with founder email
INSERT INTO public.allowed_external_emails (email, description)
VALUES ('sanjaykamal2006@gmail.com', 'Founder')
ON CONFLICT (email) DO NOTHING;

-- 3. Enable RLS to prevent public scraping of tester/admin email addresses
ALTER TABLE public.allowed_external_emails ENABLE ROW LEVEL SECURITY;

-- Allow service_role full management access
DROP POLICY IF EXISTS "service_role_manage_allowed_emails" ON public.allowed_external_emails;
CREATE POLICY "service_role_manage_allowed_emails" ON public.allowed_external_emails
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow postgres and service_role to select
GRANT ALL ON public.allowed_external_emails TO service_role, postgres;

-- 4. Update the trigger function on auth.users to read dynamically from allowed_external_emails
CREATE OR REPLACE FUNCTION public.check_auth_user_email_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  clean_email text;
  email_domain text;
BEGIN
  -- Normalize email
  clean_email := lower(trim(coalesce(NEW.email, '')));

  -- Reject missing or invalid email format
  IF clean_email = '' OR clean_email NOT LIKE '%@%' THEN
    RAISE EXCEPTION 'Email domain not authorized for LOOP signup';
  END IF;

  email_domain := split_part(clean_email, '@', 2);

  -- 1. Hardcoded institutional domains
  IF email_domain IN ('vitapstudent.ac.in', 'vitap.ac.in') THEN
    RETURN NEW;
  END IF;

  -- 2. Dynamic check against allowed_external_emails table
  IF EXISTS (
    SELECT 1 FROM public.allowed_external_emails
    WHERE email = clean_email
  ) THEN
    RETURN NEW;
  END IF;

  -- Reject all other emails
  RAISE EXCEPTION 'Email domain not authorized for LOOP signup';
END;
$$;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION public.check_auth_user_email_domain() TO PUBLIC, service_role;
