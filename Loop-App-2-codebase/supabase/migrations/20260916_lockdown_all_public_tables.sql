-- Migration: Lockdown all public tables to authenticated users only
-- Created: 2026-09-16

-- 1. trusted_vehicles: authenticated only
DROP POLICY IF EXISTS "Anyone can view trusted vehicles." ON public.trusted_vehicles;
DROP POLICY IF EXISTS "trusted_vehicles_select" ON public.trusted_vehicles;
CREATE POLICY "trusted_vehicles_select" ON public.trusted_vehicles
FOR SELECT TO authenticated
USING (true);

-- 2. expected_fares: authenticated only
DROP POLICY IF EXISTS "Anyone can view expected fares." ON public.expected_fares;
DROP POLICY IF EXISTS "expected_fares_select" ON public.expected_fares;
CREATE POLICY "expected_fares_select" ON public.expected_fares
FOR SELECT TO authenticated
USING (true);

-- 3. loop_participants: deprecated table, block access
DROP POLICY IF EXISTS "Participants are viewable by everyone" ON public.loop_participants;
DROP POLICY IF EXISTS "loop_participants_select" ON public.loop_participants;
CREATE POLICY "loop_participants_select" ON public.loop_participants
FOR SELECT TO authenticated
USING (false);
