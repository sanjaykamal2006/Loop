-- ==============================================================================
-- 20261019_safety_privacy_hardening.sql
-- Sentinelia hardening: female-only integrity, contact access gating,
-- and full account-deletion completeness.
-- ==============================================================================

-- 1. loops_insert / loops_update: enforce female-only invariant at DB level
DROP POLICY IF EXISTS "loops_insert" ON public.loops;
CREATE POLICY "loops_insert" ON public.loops FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = creator_id
    AND (
      NOT is_female_only
      OR is_female_only IS NULL
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (SELECT auth.uid()) AND p.gender = 'female'
      )
    )
  );

DROP POLICY IF EXISTS "loops_update" ON public.loops;
CREATE POLICY "loops_update" ON public.loops FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = creator_id)
  WITH CHECK (
    (SELECT auth.uid()) = creator_id
    AND (
      NOT is_female_only
      OR is_female_only IS NULL
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (SELECT auth.uid()) AND p.gender = 'female'
      )
    )
  );

-- 2. profile_contacts_select: pass-through unified between direct select and
--      get_loop_contacts(); later migrations narrow passenger exposure. See
--      20261023_contact_gating_and_female_only.sql for the final mandate.
DROP POLICY IF EXISTS "profile_contacts_select" ON public.profile_contacts;
CREATE POLICY "profile_contacts_select" ON public.profile_contacts
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.loop_members lm1
      JOIN public.loop_members lm2 ON lm1.loop_id = lm2.loop_id
      WHERE lm1.user_id = (SELECT auth.uid())
        AND lm2.user_id = profile_contacts.user_id
    )
  );

-- 3. Direct message deletion for the author (fixes the missing
--    true-erasure capability; the reconciled host-moderation policy is
--    restored in 20261023_contact_gating_and_female_only.sql).
DROP POLICY IF EXISTS "messages_delete" ON public.messages;
CREATE POLICY "messages_delete" ON public.messages
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
