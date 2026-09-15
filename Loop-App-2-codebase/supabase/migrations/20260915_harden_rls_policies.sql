-- Migration: Harden Row-Level Security (RLS) policies against IDOR and unauthorized access
-- Created: 2026-09-15

-- 1. Restrict message reading exclusively to loop members and the loop creator
DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages 
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.loop_members 
    WHERE loop_members.loop_id = messages.loop_id 
      AND loop_members.user_id = (SELECT auth.uid())
  )
  OR
  EXISTS (
    SELECT 1 FROM public.loops 
    WHERE loops.id = messages.loop_id 
      AND loops.creator_id = (SELECT auth.uid())
  )
);

-- 2. Restrict message sending exclusively to verified loop members and the loop creator
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages 
FOR INSERT TO authenticated
WITH CHECK (
  ((SELECT auth.uid()) = user_id)
  AND (
    EXISTS (
      SELECT 1 FROM public.loop_members 
      WHERE loop_members.loop_id = messages.loop_id 
        AND loop_members.user_id = (SELECT auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.loops 
      WHERE loops.id = messages.loop_id 
        AND loops.creator_id = (SELECT auth.uid())
    )
  )
);

-- 3. Prevent inserting membership into ended/cancelled loops and enforce female-only checks at DB level
DROP POLICY IF EXISTS "members_insert" ON public.loop_members;
CREATE POLICY "members_insert" ON public.loop_members 
FOR INSERT TO authenticated
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
