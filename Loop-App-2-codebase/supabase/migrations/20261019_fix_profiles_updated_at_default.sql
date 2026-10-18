-- ==============================================================================
-- 20261019_fix_profiles_updated_at_default.sql
-- Ensure timezone-safe DEFAULT now() on public.profiles.updated_at.
--
-- timezone('utc', now()) returns timestamp without time zone (wall-clock UTC).
-- When assigned to a timestamptz column, Postgres re-interprets it in the session
-- TimeZone, creating timezone-dependent offset errors on non-UTC sessions.
-- now() returns an absolute timestamptz instant, ensuring universal correctness.
-- ==============================================================================

ALTER TABLE public.profiles
  ALTER COLUMN updated_at SET DEFAULT now();
