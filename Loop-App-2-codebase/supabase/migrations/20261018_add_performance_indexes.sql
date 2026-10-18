-- ==============================================================================
-- 20261018_add_performance_indexes.sql
-- Add missing performance and composite indexes to align schema migrations
-- with production state.
--
-- Adds:
-- 1. idx_loop_members_user_id on public.loop_members (user_id)
-- 2. idx_loops_creator_id on public.loops (creator_id)
-- 3. idx_loops_expires_at on public.loops (expires_at)
-- 4. idx_loops_status_created on public.loops (status, created_at DESC)
-- 5. idx_messages_loop_created on public.messages (loop_id, created_at)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_loop_members_user_id
  ON public.loop_members USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_loops_creator_id
  ON public.loops USING btree (creator_id);

CREATE INDEX IF NOT EXISTS idx_loops_expires_at
  ON public.loops USING btree (expires_at);

CREATE INDEX IF NOT EXISTS idx_loops_status_created
  ON public.loops USING btree (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_loop_created
  ON public.messages USING btree (loop_id, created_at);
