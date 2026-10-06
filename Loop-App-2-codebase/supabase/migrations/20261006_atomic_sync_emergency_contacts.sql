-- ==============================================================================
-- Migration: 20261006_atomic_sync_emergency_contacts.sql
-- Description:
--   Atomic stored procedure to synchronize emergency contacts for the authenticated
--   user inside a single database transaction. Eliminates race conditions and
--   prevents temporary loss of emergency contacts during synchronization.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.sync_emergency_contacts(contacts_payload jsonb)
RETURNS TABLE (
  id uuid,
  name text,
  phone text,
  relation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid;
  contact_count int;
  item jsonb;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF jsonb_typeof(contacts_payload) <> 'array' THEN
    RAISE EXCEPTION 'contacts_payload must be a JSON array';
  END IF;

  contact_count := jsonb_array_length(contacts_payload);
  IF contact_count > 3 THEN
    RAISE EXCEPTION 'Maximum of 3 emergency contacts allowed';
  END IF;

  -- Delete existing contacts within the same transaction
  DELETE FROM public.emergency_contacts WHERE user_id = caller_id;

  -- Insert new contacts if any provided
  IF contact_count > 0 THEN
    FOR item IN SELECT * FROM jsonb_array_elements(contacts_payload)
    LOOP
      IF trim(item->>'name') IS NOT NULL AND length(trim(item->>'name')) > 0 AND
         trim(item->>'phone') IS NOT NULL AND length(trim(item->>'phone')) >= 10 THEN
        INSERT INTO public.emergency_contacts (user_id, name, phone, relation)
        VALUES (
          caller_id,
          trim(item->>'name'),
          trim(item->>'phone'),
          COALESCE(trim(item->>'relation'), 'Parent')
        );
      END IF;
    END LOOP;
  END IF;

  -- Return updated contacts list
  RETURN QUERY
  SELECT ec.id, ec.name, ec.phone, ec.relation
  FROM public.emergency_contacts ec
  WHERE ec.user_id = caller_id
  ORDER BY ec.created_at ASC;
END;
$$;
