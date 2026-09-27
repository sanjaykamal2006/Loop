-- ==============================================================================
-- Migration: 20260927_reject_plus_addressing.sql
-- Description:
--   Reject plus-addressing (+) in the local part of email addresses on auth.users.
--   Prevents account multiplication (e.g. user+1@vitapstudent.ac.in, user+2@...).
--   Updates public.check_auth_user_email_domain() to RAISE EXCEPTION when
--   the local part contains a '+' symbol.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.check_auth_user_email_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  clean_email text;
  local_part text;
  email_domain text;
BEGIN
  -- Normalize email
  clean_email := lower(trim(coalesce(NEW.email, '')));

  -- Reject missing or invalid email format
  IF clean_email = '' OR clean_email NOT LIKE '%@%' THEN
    RAISE EXCEPTION 'Email domain not authorized for LOOP signup';
  END IF;

  local_part := split_part(clean_email, '@', 1);
  email_domain := split_part(clean_email, '@', 2);

  -- 1. Reject plus-addressing (+) anywhere in the local part
  IF local_part LIKE '%+%' THEN
    RAISE EXCEPTION 'Plus-addressing (+) is not allowed in email addresses.';
  END IF;

  -- 2. Hardcoded institutional domains
  IF email_domain IN ('vitapstudent.ac.in', 'vitap.ac.in') THEN
    RETURN NEW;
  END IF;

  -- 3. Dynamic check against allowed_external_emails table
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
