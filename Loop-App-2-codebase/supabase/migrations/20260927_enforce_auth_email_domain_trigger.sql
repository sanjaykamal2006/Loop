-- ==============================================================================
-- Migration: 20260927_enforce_auth_email_domain_trigger.sql
-- Description:
--   Enforce institutional email domain validation directly at the PostgreSQL
--   database layer on auth.users.
--   Rejects any signup attempt with an email that does not match:
--     - @vitapstudent.ac.in (students)
--     - @vitap.ac.in (faculty & staff)
--     - sanjaykamal2006@gmail.com (founder whitelist)
-- ==============================================================================

-- 1. Create the validation trigger function
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
  -- Normalize email string
  clean_email := lower(trim(coalesce(NEW.email, '')));

  -- Reject missing or invalid email format
  IF clean_email = '' OR clean_email NOT LIKE '%@%' THEN
    RAISE EXCEPTION 'Email domain not authorized for LOOP signup';
  END IF;

  email_domain := split_part(clean_email, '@', 2);

  -- 1. Check institutional domains
  IF email_domain IN ('vitapstudent.ac.in', 'vitap.ac.in') THEN
    RETURN NEW;
  END IF;

  -- 2. Check founder whitelist
  IF clean_email = 'sanjaykamal2006@gmail.com' THEN
    RETURN NEW;
  END IF;

  -- Reject all other emails
  RAISE EXCEPTION 'Email domain not authorized for LOOP signup';
END;
$$;

-- Grant execution permission to PUBLIC and service_role
GRANT EXECUTE ON FUNCTION public.check_auth_user_email_domain() TO PUBLIC, service_role;

-- 2. Attach the trigger to auth.users BEFORE INSERT
DROP TRIGGER IF EXISTS trg_validate_auth_user_email ON auth.users;
CREATE TRIGGER trg_validate_auth_user_email
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.check_auth_user_email_domain();
