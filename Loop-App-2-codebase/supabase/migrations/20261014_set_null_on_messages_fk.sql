-- ==============================================================================
-- Fix: Prevent chat history & cancellation notices from being wiped on user deletion
-- Converts fk_messages_profiles from ON DELETE CASCADE to ON DELETE SET NULL.
-- ==============================================================================

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS fk_messages_profiles,
  ADD CONSTRAINT fk_messages_profiles
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
