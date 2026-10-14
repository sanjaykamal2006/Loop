-- ==============================================================================
-- LOOP Database Migration: 20261015_reconcile_rls_and_performance.sql
-- Reconcile all RLS policies to use (SELECT auth.uid()) initplan caching,
-- enforce strict search_path on functions, and ensure missing FK indexes are created.
-- ==============================================================================

-- 1. SECURITY: Enforce explicit search_path on maintenance functions
ALTER FUNCTION public.purge_old_data() SET search_path = public;
ALTER FUNCTION public.expire_old_loops() SET search_path = public;
ALTER FUNCTION public.delete_loop(uuid) SET search_path = public;

-- 2. PERFORMANCE: Add missing indexes on foreign key columns
CREATE INDEX IF NOT EXISTS idx_trusted_vehicles_user_id ON public.trusted_vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_expected_fares_user_id ON public.expected_fares(user_id);
CREATE INDEX IF NOT EXISTS idx_loop_participants_user_id ON public.loop_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_loop_members_loop_id ON public.loop_members(loop_id);
CREATE INDEX IF NOT EXISTS idx_messages_loop_id ON public.messages(loop_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);

-- 3. STORAGE: Drop redundant / duplicate permissive policies if present
DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar." ON storage.objects;

-- 4. CLEANUP: Drop duplicate legacy foreign key constraint on messages if present
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS fk_messages_user_id;

-- 5. PERFORMANCE & HARDENING: Reconcile all RLS policies with (SELECT auth.uid()) initplan evaluation

-- loops: SELECT
DROP POLICY IF EXISTS "loops_select" ON public.loops;
CREATE POLICY "loops_select" ON public.loops FOR SELECT TO authenticated
  USING (
    (is_female_only = false) 
    OR (is_female_only IS NULL) 
    OR (creator_id = (SELECT auth.uid())) 
    OR (EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = (SELECT auth.uid()) AND p.gender = 'female'
    ))
  );

-- loops: INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "loops_insert" ON public.loops;
CREATE POLICY "loops_insert" ON public.loops FOR INSERT TO authenticated 
  WITH CHECK ((SELECT auth.uid()) = creator_id);

DROP POLICY IF EXISTS "loops_update" ON public.loops;
CREATE POLICY "loops_update" ON public.loops FOR UPDATE TO authenticated 
  USING ((SELECT auth.uid()) = creator_id) 
  WITH CHECK ((SELECT auth.uid()) = creator_id);

DROP POLICY IF EXISTS "loops_delete" ON public.loops;
CREATE POLICY "loops_delete" ON public.loops FOR DELETE TO authenticated 
  USING ((SELECT auth.uid()) = creator_id);

-- loop_members: SELECT
DROP POLICY IF EXISTS "members_select" ON public.loop_members;
CREATE POLICY "members_select" ON public.loop_members FOR SELECT TO authenticated
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

-- loop_members: INSERT, DELETE
DROP POLICY IF EXISTS "members_insert" ON public.loop_members;
CREATE POLICY "members_insert" ON public.loop_members FOR INSERT TO authenticated 
  WITH CHECK (
    ((SELECT auth.uid()) = user_id)
    AND EXISTS (
      SELECT 1 FROM public.loops
      WHERE loops.id = loop_members.loop_id
        AND loops.status IN ('open', 'started', 'active', 'in_progress')
        AND (
          loops.is_female_only = false
          OR loops.creator_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (SELECT auth.uid()) 
              AND profiles.gender = 'female'
          )
        )
    )
  );

DROP POLICY IF EXISTS "members_delete" ON public.loop_members;
CREATE POLICY "members_delete" ON public.loop_members FOR DELETE TO authenticated 
  USING (
    ((SELECT auth.uid()) = user_id) 
    OR EXISTS (SELECT 1 FROM public.loops WHERE loops.id = loop_members.loop_id AND loops.creator_id = (SELECT auth.uid()))
  );

-- messages: UPDATE (reconciled from auth.uid() to (SELECT auth.uid()))
DROP POLICY IF EXISTS "messages_update" ON public.messages;
CREATE POLICY "messages_update" ON public.messages FOR UPDATE TO authenticated 
  USING ((SELECT auth.uid()) = user_id) 
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- messages: DELETE
DROP POLICY IF EXISTS "messages_delete" ON public.messages;
CREATE POLICY "messages_delete" ON public.messages FOR DELETE TO authenticated 
  USING (
    ((SELECT auth.uid()) = user_id) 
    OR EXISTS (SELECT 1 FROM public.loops WHERE loops.id = messages.loop_id AND loops.creator_id = (SELECT auth.uid()))
  );

-- trusted_vehicles
DROP POLICY IF EXISTS "trusted_vehicles_select" ON public.trusted_vehicles;
CREATE POLICY "trusted_vehicles_select" ON public.trusted_vehicles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own trusted vehicles." ON public.trusted_vehicles;
DROP POLICY IF EXISTS "trusted_vehicles_insert" ON public.trusted_vehicles;
CREATE POLICY "trusted_vehicles_insert" ON public.trusted_vehicles FOR INSERT TO authenticated 
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "trusted_vehicles_update" ON public.trusted_vehicles;
CREATE POLICY "trusted_vehicles_update" ON public.trusted_vehicles FOR UPDATE TO authenticated 
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own trusted vehicles." ON public.trusted_vehicles;
DROP POLICY IF EXISTS "trusted_vehicles_delete" ON public.trusted_vehicles;
CREATE POLICY "trusted_vehicles_delete" ON public.trusted_vehicles FOR DELETE TO authenticated 
  USING ((SELECT auth.uid()) = user_id);

-- profile_contacts
DROP POLICY IF EXISTS "profile_contacts_select" ON public.profile_contacts;
CREATE POLICY "profile_contacts_select" ON public.profile_contacts FOR SELECT TO authenticated
  USING (
    (user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.loop_members lm1
      JOIN public.loop_members lm2 ON lm1.loop_id = lm2.loop_id
      WHERE lm1.user_id = (SELECT auth.uid()) AND lm2.user_id = profile_contacts.user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.loops l
      WHERE (
        (l.creator_id = (SELECT auth.uid()) AND EXISTS (
          SELECT 1 FROM public.loop_members lm WHERE lm.loop_id = l.id AND lm.user_id = profile_contacts.user_id
        ))
        OR
        (l.creator_id = profile_contacts.user_id AND EXISTS (
          SELECT 1 FROM public.loop_members lm WHERE lm.loop_id = l.id AND lm.user_id = (SELECT auth.uid())
        ))
      )
    )
  );

DROP POLICY IF EXISTS "profile_contacts_insert" ON public.profile_contacts;
CREATE POLICY "profile_contacts_insert" ON public.profile_contacts FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profile_contacts_update" ON public.profile_contacts;
CREATE POLICY "profile_contacts_update" ON public.profile_contacts FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profile_contacts_delete" ON public.profile_contacts;
CREATE POLICY "profile_contacts_delete" ON public.profile_contacts FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
