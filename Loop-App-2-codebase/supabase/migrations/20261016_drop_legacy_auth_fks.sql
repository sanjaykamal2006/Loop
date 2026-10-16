-- ==============================================================================
-- 20261016_drop_legacy_auth_fks.sql
-- Drop legacy foreign keys referencing auth.users from public tables.
--
-- In early schema iterations, loops.creator_id, loop_members.user_id, and
-- messages.user_id directly referenced auth.users(id) with ON DELETE CASCADE.
-- Later hardening introduced public.profiles and switched loops and messages
-- to ON DELETE SET NULL to preserve ride coordination records and chat histories
-- when a user deletes their account.
--
-- The legacy constraints (loops_creator_id_fkey, loop_members_user_id_fkey,
-- messages_user_id_fkey) pointing to auth.users remained in production alongside
-- the profiles FKs, causing user deletions to cascade and wipe records.
--
-- This migration drops those legacy foreign keys so that referential actions
-- strictly adhere to the intended public.profiles constraints.
-- ==============================================================================

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_user_id_fkey;

ALTER TABLE public.loops
  DROP CONSTRAINT IF EXISTS loops_creator_id_fkey;

ALTER TABLE public.loop_members
  DROP CONSTRAINT IF EXISTS loop_members_user_id_fkey;
