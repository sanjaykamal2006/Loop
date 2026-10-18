-- ==============================================================================
-- 20261017_allow_message_anonymisation.sql
-- Allow message anonymisation (user_id -> NULL) during account deletion.
--
-- Postgres executes foreign key ON DELETE SET NULL via an internal BEFORE UPDATE.
-- The protect_message_updates() trigger previously disallowed any change to
-- messages.user_id, which caused account deletion to abort with:
--   'Cannot alter message sender'
-- whenever a deleted user had sent messages in existing loops.
--
-- This migration updates the trigger function to allow setting user_id to NULL
-- (anonymisation on user deletion), while strictly preventing reassignment
-- of a message to any other active user.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.protect_message_updates()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.loop_id IS DISTINCT FROM OLD.loop_id THEN
    RAISE EXCEPTION 'Cannot transfer messages across loops';
  END IF;
  -- Allow user_id to be cleared (account deletion / anonymisation via ON DELETE SET NULL),
  -- but never allow reassigning a message to a different sender.
  IF NEW.user_id IS DISTINCT FROM OLD.user_id AND NEW.user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot alter message sender';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_message_updates ON public.messages;
CREATE TRIGGER trg_protect_message_updates BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.protect_message_updates();
