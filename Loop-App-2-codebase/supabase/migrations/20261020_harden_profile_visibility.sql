-- ==============================================================================
-- 20261020_harden_profile_visibility.sql
-- Closes the remaining over-broad SELECT surfaces found in the whole-app audit:
--
-- 1. profiles_select USING (true)
--      -> any authenticated user could dump every profile row (all reg_nos,
--         genders, bios, themes). Narrowed to: self, ride co-members, and
--         ride hosts (hosts are intentionally public-facing in-app).
-- 2. trusted_vehicles_select USING (true)
--      -> every user's private driver book (names + phone numbers) was
--         readable by any authenticated user. Now owner-only.
-- 3. expected_fares_select USING (true)
--      -> fare entries readable by anyone. Now owner-only; the community fare
--         board keeps working through the SECURITY DEFINER reporting RPC
--         get_expected_fares() which returns only safe display columns.
-- 4. Missing index for the home feed query
--      (status IN (…) AND departure_time >= … ORDER BY departure_time LIMIT 30).
-- ==============================================================================

-- 1. Membership-aware profile visibility --------------------------------------
-- SECURITY DEFINER: the check must not depend on the caller's RLS view of
-- loop_members (which is intentionally broad for ride rosters).
CREATE OR REPLACE FUNCTION public.can_view_profile(target_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    target_user = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.loop_members me
      JOIN public.loop_members them ON them.loop_id = me.loop_id
      WHERE me.user_id = (SELECT auth.uid())
        AND them.user_id = target_user
    )
    OR EXISTS (
      SELECT 1 FROM public.loops l WHERE l.creator_id = target_user
    );
$$;

REVOKE ALL ON FUNCTION public.can_view_profile(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_profile(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO authenticated;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (public.can_view_profile(id));

-- 2. trusted_vehicles: private driver book -------------------------------------
DROP POLICY IF EXISTS "trusted_vehicles_select" ON public.trusted_vehicles;
CREATE POLICY "trusted_vehicles_select" ON public.trusted_vehicles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- 3. expected_fares: owner-only rows + community reporting RPC -----------------
DROP POLICY IF EXISTS "expected_fares_select" ON public.expected_fares;
CREATE POLICY "expected_fares_select" ON public.expected_fares FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.get_expected_fares()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  from_location text,
  to_location text,
  expected_fare numeric,
  vehicle_type text,
  created_at timestamptz,
  display_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id,
    f.user_id,
    f.from_location,
    f.to_location,
    f.expected_fare,
    f.vehicle_type,
    f.created_at,
    p.display_name,
    p.avatar_url
  FROM public.expected_fares f
  LEFT JOIN public.profiles p ON p.id = f.user_id
  ORDER BY f.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_expected_fares() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_expected_fares() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_expected_fares() TO authenticated;

-- 4. Home feed index (partial: only rows the feed can ever return) ------------
CREATE INDEX IF NOT EXISTS idx_loops_departure_time_active
  ON public.loops (departure_time)
  WHERE status IN ('open', 'started', 'active', 'in_progress');

-- Ask PostgREST to reload its schema cache so the new RPC and policy
-- changes are visible to the API immediately after deploy.
-- (No-op on plain PostgreSQL without PostgREST listeners.)
NOTIFY pgrst, 'reload schema';
