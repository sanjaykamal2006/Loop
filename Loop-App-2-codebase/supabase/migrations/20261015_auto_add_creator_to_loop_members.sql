-- 20261015_auto_add_creator_to_loop_members.sql
-- Guarantee transactional atomicity: automatically enrol ride creator into loop_members upon loop creation

CREATE OR REPLACE FUNCTION public.auto_add_creator_to_loop_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.creator_id IS NOT NULL THEN
    INSERT INTO public.loop_members (loop_id, user_id)
    VALUES (NEW.id, NEW.creator_id)
    ON CONFLICT (loop_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if previously defined and bind to public.loops
DROP TRIGGER IF EXISTS trg_auto_add_creator_to_loop_members ON public.loops;
CREATE TRIGGER trg_auto_add_creator_to_loop_members
AFTER INSERT ON public.loops
FOR EACH ROW
EXECUTE FUNCTION public.auto_add_creator_to_loop_members();
