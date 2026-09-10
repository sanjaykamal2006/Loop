-- ==============================================================================
-- LOOP Supabase Database Advisory & Performance Fixes
-- Applied directly to resolve all Supabase Linter / Advisor warnings.
-- ==============================================================================

-- 1. SECURITY: Fix mutable search_path on functions with SECURITY DEFINER
-- Resolves Supabase Security Advisor warning: function_search_path_mutable
ALTER FUNCTION public.purge_old_data() SET search_path = public;
ALTER FUNCTION public.expire_old_loops() SET search_path = public;
ALTER FUNCTION public.delete_user_account() SET search_path = public;
ALTER FUNCTION public.delete_loop(uuid) SET search_path = public;
ALTER FUNCTION public.check_user_exists(text) SET search_path = public;

-- 2. PERFORMANCE: Add missing indexes on foreign key columns
-- Resolves Supabase Performance Advisor warning: unindexed_foreign_keys
CREATE INDEX IF NOT EXISTS idx_trusted_vehicles_user_id ON public.trusted_vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_expected_fares_user_id ON public.expected_fares(user_id);
CREATE INDEX IF NOT EXISTS idx_loop_participants_user_id ON public.loop_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_loop_members_loop_id ON public.loop_members(loop_id);

-- 3. PERFORMANCE: Remove redundant / duplicate permissive policies on storage.objects
-- Resolves Supabase Performance Advisor warning: multiple_permissive_policies
DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar." ON storage.objects;

-- 4. CLEANUP: Remove duplicate constraint on messages
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS fk_messages_user_id;

-- 5. PERFORMANCE: Optimize RLS policies with (select auth.uid()) to avoid re-evaluating on every row
-- Resolves Supabase Performance Advisor warning: auth_rls_initplan

-- loops
DROP POLICY IF EXISTS "loops_delete" ON public.loops;
CREATE POLICY "loops_delete" ON public.loops FOR DELETE TO authenticated 
  USING ((select auth.uid()) = creator_id);

DROP POLICY IF EXISTS "loops_insert" ON public.loops;
CREATE POLICY "loops_insert" ON public.loops FOR INSERT TO authenticated 
  WITH CHECK ((select auth.uid()) = creator_id);

DROP POLICY IF EXISTS "loops_update" ON public.loops;
CREATE POLICY "loops_update" ON public.loops FOR UPDATE TO authenticated 
  USING ((select auth.uid()) = creator_id) 
  WITH CHECK ((select auth.uid()) = creator_id);

-- loop_members
DROP POLICY IF EXISTS "members_delete" ON public.loop_members;
CREATE POLICY "members_delete" ON public.loop_members FOR DELETE TO authenticated 
  USING (((select auth.uid()) = user_id) OR (EXISTS (SELECT 1 FROM loops WHERE loops.id = loop_members.loop_id AND loops.creator_id = (select auth.uid()))));

DROP POLICY IF EXISTS "members_insert" ON public.loop_members;
CREATE POLICY "members_insert" ON public.loop_members FOR INSERT TO authenticated 
  WITH CHECK ((select auth.uid()) = user_id);

-- messages
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated 
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "messages_update" ON public.messages;
CREATE POLICY "messages_update" ON public.messages FOR UPDATE TO public 
  USING ((select auth.uid()) = user_id) 
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "messages_delete" ON public.messages;
CREATE POLICY "messages_delete" ON public.messages FOR DELETE TO authenticated 
  USING (((select auth.uid()) = user_id) OR (EXISTS (SELECT 1 FROM loops WHERE loops.id = messages.loop_id AND loops.creator_id = (select auth.uid()))));


-- profiles
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated 
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated 
  USING ((select auth.uid()) = id) 
  WITH CHECK ((select auth.uid()) = id);

-- trusted_vehicles
DROP POLICY IF EXISTS "Users can insert their own trusted vehicles." ON public.trusted_vehicles;
CREATE POLICY "Users can insert their own trusted vehicles." ON public.trusted_vehicles FOR INSERT TO public 
  WITH CHECK (((select auth.role()) = 'authenticated') AND ((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can delete their own trusted vehicles." ON public.trusted_vehicles;
CREATE POLICY "Users can delete their own trusted vehicles." ON public.trusted_vehicles FOR DELETE TO public 
  USING ((select auth.uid()) = user_id);

-- expected_fares
DROP POLICY IF EXISTS "Authenticated users can insert expected fares." ON public.expected_fares;
CREATE POLICY "Authenticated users can insert expected fares." ON public.expected_fares FOR INSERT TO public 
  WITH CHECK (((select auth.role()) = 'authenticated') AND ((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users can delete their own expected fares." ON public.expected_fares;
CREATE POLICY "Users can delete their own expected fares." ON public.expected_fares FOR DELETE TO public 
  USING ((select auth.uid()) = user_id);

-- loop_participants
DROP POLICY IF EXISTS "Users can insert their own participation" ON public.loop_participants;
CREATE POLICY "Users can insert their own participation" ON public.loop_participants FOR INSERT TO public 
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own participation" ON public.loop_participants;
CREATE POLICY "Users can delete their own participation" ON public.loop_participants FOR DELETE TO public 
  USING ((select auth.uid()) = user_id);
