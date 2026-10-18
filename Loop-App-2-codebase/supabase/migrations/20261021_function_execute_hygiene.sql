-- ==============================================================================
-- 20261021_function_execute_hygiene.sql
-- Least-privilege EXECUTE grants for the remaining functions flagged by the
-- whole-app audit (anon or public EXECUTE where no client role needs it):
--
-- 1. sync_emergency_contacts(jsonb)
--      anon could EXECUTE it. The function body already raised
--      'Not authenticated' for anonymous callers, but the correct posture is
--      authenticated-only so anon gets a straight permission denial.
-- 2. auto_add_creator_to_loop_members()
--      Pure trigger function (AFTER INSERT ON loops). Trigger execution does
--      not consult EXECUTE privileges, so no client role should hold it.
-- 3. check_auth_user_email_domain()
--      Pure trigger function (BEFORE INSERT ON auth.users), same treatment.
--
-- health_check() intentionally remains anon-executable: it is a read-only
-- public liveness probe used by uptime monitors.
-- ==============================================================================

-- 1. Emergency contact sync RPC: authenticated only -----------------------------
REVOKE ALL ON FUNCTION public.sync_emergency_contacts(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_emergency_contacts(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_emergency_contacts(jsonb) TO authenticated;

-- 2. Trigger function: no client role ------------------------------------------
REVOKE ALL ON FUNCTION public.auto_add_creator_to_loop_members() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auto_add_creator_to_loop_members() FROM anon;
REVOKE ALL ON FUNCTION public.auto_add_creator_to_loop_members() FROM authenticated;

-- 3. Auth.users trigger function: no client role -------------------------------
REVOKE ALL ON FUNCTION public.check_auth_user_email_domain() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_auth_user_email_domain() FROM anon;
REVOKE ALL ON FUNCTION public.check_auth_user_email_domain() FROM authenticated;

-- Ask PostgREST to reload its schema cache immediately after deploy.
-- (No-op on plain PostgreSQL without PostgREST listeners.)
NOTIFY pgrst, 'reload schema';
