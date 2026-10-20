-- ==============================================================================
-- 20261023_contact_gating_and_female_only.sql
--
-- Closes the contact-harvesting and female-only bypass paths found in the audit.
--
-- 1. get_loop_contacts() mandate: a drive-by user who self-joins an open loop
--    could previously read EVERY stored co-member phone number. The live loop's
--    phone currency is gated now:
--      - caller must be the host or an active member of a non-expired loop;
--      - everyone still sees their own contact;
--      - members see the host's contact (coordination need);
--      - a passenger sees another passenger's contact ONLY when the caller
--        joined the ride BEFORE that passenger joined (anti-drive-by: the
--        newest joiner harvests nothing; earlier joiners can reach newer ones).
--    The UI degrades gracefully (PassengerList falls back to
--    "Coordinate via in-app chat!") so no product flow breaks.
--
-- 2. profile_contacts_select RLS mirrors the same mandate (defense in depth
--    against direct PostgREST selects on the table).
--
-- 3. messages_delete: restored from the reconciled policy (author OR host) so
--    hosts keep in-ride moderation.
--
-- 4. Female-only integrity, enforced by the database only:
--      - loops_insert / loops_update: a loop flagged is_female_only must be
--        created (or switched) by a female creator;
--      - members_insert: joining a female-only loop requires the joiner to be
--        female unless the joiner is the (necessarily female) creator;
--      - gender pinning during a live female-only ride already comes from the
--        existing public.protect_profile_updates() trigger.
--
-- 5. Fair-use caps without any paid service (database triggers):
--      - at most 8 ride joins per 24 h per account;
--      - at most 6 loops created per 24 h per account.
--    These bound drive-by roster enumeration and loop spam.
-- ==============================================================================

-- 1. Mandate-gated contact RPC -------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_loop_contacts(target_loop_id uuid)
RETURNS TABLE (
  user_id uuid,
  phone_number text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := (SELECT auth.uid());
  host_id uuid;
BEGIN
  IF caller IS NULL THEN
    RETURN;
  END IF;

  -- The caller must be the host or an active member of a live loop.
  SELECT l.creator_id INTO host_id
  FROM public.loops l
  WHERE l.id = target_loop_id
    AND l.expires_at > now()
    AND (
      l.creator_id = caller
      OR EXISTS (
        SELECT 1 FROM public.loop_members lm
        WHERE lm.loop_id = l.id AND lm.user_id = caller
      )
    );
  IF host_id IS NULL THEN
    RETURN; -- Caller is not part of this ride.
  END IF;

  RETURN QUERY
  SELECT pc.user_id, pc.phone_number
  FROM public.profile_contacts pc
  WHERE (
        EXISTS (
          SELECT 1 FROM public.loop_members lm
          WHERE lm.loop_id = target_loop_id AND lm.user_id = pc.user_id
        )
        OR pc.user_id = host_id
      )
    AND (
      -- Own number
      pc.user_id = caller
      -- The host's number is coordination-critical for every member
      OR pc.user_id = host_id
      -- Passenger-to-passenger: caller joined before the contact owner
      OR EXISTS (
        SELECT 1
        FROM public.loop_members viewer_m, public.loop_members owner_m
        WHERE viewer_m.loop_id = target_loop_id AND viewer_m.user_id = caller
          AND owner_m.loop_id = target_loop_id AND owner_m.user_id = pc.user_id
          AND viewer_m.joined_at < owner_m.joined_at
      )
      -- The host sees every member's number (joined earliest so the order rule
      -- already covers the host; the explicit host override adds robustness)
      OR (caller = host_id AND host_id IS DISTINCT FROM pc.user_id)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_loop_contacts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_loop_contacts(uuid) TO authenticated, service_role;

-- 2. Mirror the mandate in the direct-select RLS path ---------------------------
DROP POLICY IF EXISTS "profile_contacts_select" ON public.profile_contacts;
CREATE POLICY "profile_contacts_select" ON public.profile_contacts
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.loops l
      JOIN public.loop_members owner_m
        ON owner_m.loop_id = l.id AND owner_m.user_id = profile_contacts.user_id
      JOIN public.loop_members viewer_m
        ON viewer_m.loop_id = l.id AND viewer_m.user_id = (SELECT auth.uid())
      WHERE l.expires_at > now()
        AND (
          l.creator_id = profile_contacts.user_id            -- host contact
          OR (l.creator_id = (SELECT auth.uid()))            -- caller is the host
          OR viewer_m.joined_at < owner_m.joined_at          -- earlier joiner sees later joiner
        )
    )
  );

-- 3. Keep host message moderation ------------------------------------------------
DROP POLICY IF EXISTS "messages_delete" ON public.messages;
CREATE POLICY "messages_delete" ON public.messages FOR DELETE TO authenticated
  USING (
    ((SELECT auth.uid()) = user_id)
    OR EXISTS (SELECT 1 FROM public.loops WHERE loops.id = messages.loop_id AND loops.creator_id = (SELECT auth.uid()))
  );

-- 4. Female-only integrity --------------------------------------------------------
DROP POLICY IF EXISTS "loops_insert" ON public.loops;
CREATE POLICY "loops_insert" ON public.loops FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = creator_id
    AND (
      is_female_only IS NOT TRUE
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
      is_female_only IS NOT TRUE
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (SELECT auth.uid()) AND p.gender = 'female'
      )
    )
  );

DROP POLICY IF EXISTS "members_insert" ON public.loop_members;
CREATE POLICY "members_insert" ON public.loop_members FOR INSERT TO authenticated
  WITH CHECK (
    ((SELECT auth.uid()) = user_id)
    AND EXISTS (
      SELECT 1 FROM public.loops
      WHERE loops.id = loop_members.loop_id
        AND loops.status IN ('open', 'started', 'active', 'in_progress')
        AND (
          loops.is_female_only IS NOT TRUE
          OR loops.creator_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = (SELECT auth.uid())
              AND profiles.gender = 'female'
          )
        )
    )
  );

-- Pin gender while a female-only participation is live is already enforced by
-- the existing public.protect_profile_updates() trigger
-- (20260924_production_hardening.sql), which locks female->other changes while
-- hosting or riding an active female-only loop. Do not duplicate it here.

-- 5. Fair-use caps (no paid service) ----------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_join_rate_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT count(*) FROM public.loop_members
    WHERE user_id = NEW.user_id
      AND joined_at > now() - interval '24 hours'
  ) >= 8 THEN
    RAISE EXCEPTION 'Too many rides joined in the last 24 hours. Please try again later.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_join_rate_cap ON public.loop_members;
CREATE TRIGGER trg_join_rate_cap
  BEFORE INSERT ON public.loop_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_join_rate_cap();

CREATE OR REPLACE FUNCTION public.enforce_loop_rate_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT count(*) FROM public.loops
    WHERE creator_id = NEW.creator_id
      AND created_at > now() - interval '24 hours'
  ) >= 6 THEN
    RAISE EXCEPTION 'Too many rides created in the last 24 hours. Please try again later.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_loop_rate_cap ON public.loops;
CREATE TRIGGER trg_loop_rate_cap
  BEFORE INSERT ON public.loops
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_loop_rate_cap();

-- Hygiene: definer helpers are internal-only -------------------------------------
REVOKE EXECUTE ON FUNCTION public.enforce_join_rate_cap()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_loop_rate_cap()
  FROM PUBLIC, anon, authenticated;
