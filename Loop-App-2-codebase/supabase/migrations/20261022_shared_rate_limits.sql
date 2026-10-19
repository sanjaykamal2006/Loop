-- ==============================================================================
-- 20261022_shared_rate_limits.sql
-- Cross-instance rate limiting without a paid Redis dependency.
--
-- Server routes call the SECURITY DEFINER function below with the service-role
-- key. The table is RLS-enabled with no policies and no grants to anon or
-- authenticated, so clients can never read or seed rate-limit counters.
-- The upsert is atomic: concurrent requests serialize on the primary key.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  reset_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limits_reset_at_idx
  ON public.rate_limits (reset_at);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rate_limits FROM PUBLIC;
REVOKE ALL ON TABLE public.rate_limits FROM anon;
REVOKE ALL ON TABLE public.rate_limits FROM authenticated;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_max_requests integer,
  p_window_ms integer
)
RETURNS TABLE (
  allowed boolean,
  count integer,
  remaining integer,
  reset_in_seconds integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_reset_at timestamptz;
BEGIN
  IF p_key IS NULL OR length(p_key) = 0
     OR p_max_requests < 1 OR p_window_ms < 1 THEN
    RAISE EXCEPTION 'invalid rate limit parameters';
  END IF;

  INSERT INTO public.rate_limits AS rl (key, count, reset_at)
  VALUES (
    left(p_key, 256),
    1,
    now() + make_interval(secs => p_window_ms / 1000.0)
  )
  ON CONFLICT (key) DO UPDATE
    SET count = CASE WHEN rl.reset_at <= now() THEN 1 ELSE rl.count + 1 END,
        reset_at = CASE WHEN rl.reset_at <= now() THEN excluded.reset_at ELSE rl.reset_at END
  RETURNING rl.count, rl.reset_at INTO v_count, v_reset_at;

  -- Bounded opportunistic cleanup (indexed, at most 25 rows, ~5% of calls).
  IF random() < 0.05 THEN
    DELETE FROM public.rate_limits
    WHERE key IN (
      SELECT key FROM public.rate_limits
      WHERE reset_at < now() - interval '1 day'
      ORDER BY reset_at
      LIMIT 25
    );
  END IF;

  RETURN QUERY
  SELECT
    v_count <= p_max_requests,
    v_count,
    greatest(p_max_requests - v_count, 0),
    greatest(ceil(extract(epoch FROM (v_reset_at - now())))::integer, 1);
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;

NOTIFY pgrst, 'reload schema';
