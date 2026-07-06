
-- 1. Rate limit tracking table
CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  window_key text NOT NULL,  -- e.g. '2026-07-06T17:23' (minute) or '2026-07-06' (day)
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, function_name, window_key)
);

-- Only service role touches this; no client access.
GRANT ALL ON public.edge_rate_limits TO service_role;
ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;
-- (No policies = no access for anon/authenticated. Service role bypasses RLS.)

CREATE INDEX IF NOT EXISTS idx_edge_rate_limits_updated
  ON public.edge_rate_limits (updated_at);

-- 2. Atomic check-and-increment RPC
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  _user_id uuid,
  _function_name text,
  _per_minute integer DEFAULT 10,
  _per_day integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_minute_key text := to_char(v_now AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI');
  v_day_key text := to_char(v_now AT TIME ZONE 'UTC', 'YYYY-MM-DD');
  v_minute_count integer;
  v_day_count integer;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'limit_type', 'no_user');
  END IF;

  -- Increment minute window
  INSERT INTO public.edge_rate_limits (user_id, function_name, window_key, count, updated_at)
  VALUES (_user_id, _function_name, 'm:' || v_minute_key, 1, v_now)
  ON CONFLICT (user_id, function_name, window_key)
  DO UPDATE SET count = public.edge_rate_limits.count + 1, updated_at = v_now
  RETURNING count INTO v_minute_count;

  -- Increment day window
  INSERT INTO public.edge_rate_limits (user_id, function_name, window_key, count, updated_at)
  VALUES (_user_id, _function_name, 'd:' || v_day_key, 1, v_now)
  ON CONFLICT (user_id, function_name, window_key)
  DO UPDATE SET count = public.edge_rate_limits.count + 1, updated_at = v_now
  RETURNING count INTO v_day_count;

  IF v_minute_count > _per_minute THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'limit_type', 'per_minute',
      'limit', _per_minute,
      'count', v_minute_count,
      'retry_after_seconds', 60
    );
  END IF;

  IF v_day_count > _per_day THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'limit_type', 'per_day',
      'limit', _per_day,
      'count', v_day_count,
      'retry_after_seconds', 3600
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'minute_count', v_minute_count,
    'day_count', v_day_count
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit(uuid, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(uuid, text, integer, integer) TO service_role;

-- 3. Drop duplicate default-channels trigger on public.teams
DROP TRIGGER IF EXISTS on_team_created_create_channels ON public.teams;
-- trg_create_default_channels remains as the single default-channels trigger.
