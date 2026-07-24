
-- =========================================================
-- 1) Cross-user enforcement on legacy user-scoped RPCs
-- =========================================================

-- Read-only helpers: silent null/false for cross-user callers so
-- RLS policies (which always pass auth.uid()) continue to work.

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_role app_role;
BEGIN
  IF _user_id IS NULL THEN RETURN NULL; END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN
    RETURN NULL;
  END IF;
  SELECT role INTO v_role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
  RETURN v_role;
END $$;

CREATE OR REPLACE FUNCTION public.get_user_team_id(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_team uuid;
BEGIN
  IF p_user_id IS NULL THEN RETURN NULL; END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RETURN NULL;
  END IF;
  SELECT team_id INTO v_team FROM public.profiles WHERE user_id = p_user_id LIMIT 1;
  RETURN v_team;
END $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END $$;

CREATE OR REPLACE FUNCTION public.has_management_role(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('owner','admin','manager')
  );
END $$;

CREATE OR REPLACE FUNCTION public.calculate_streak(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak INTEGER := 0;
  v_check_date DATE := CURRENT_DATE;
  v_completed BOOLEAN;
BEGIN
  IF p_user_id IS NULL THEN RETURN 0; END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RETURN 0;
  END IF;
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM public.user_challenge_progress ucp
      JOIN public.daily_challenges dc ON dc.id = ucp.challenge_id
      WHERE ucp.user_id = p_user_id
        AND dc.challenge_date = v_check_date
        AND ucp.completed = true
    ) INTO v_completed;
    IF v_check_date = CURRENT_DATE AND NOT v_completed THEN
      v_check_date := v_check_date - 1;
      CONTINUE;
    END IF;
    IF v_completed THEN
      v_streak := v_streak + 1;
      v_check_date := v_check_date - 1;
    ELSE
      EXIT;
    END IF;
    IF v_streak > 365 THEN EXIT; END IF;
  END LOOP;
  RETURN v_streak;
END $$;

-- Mutation / create-on-read RPCs: hard forbid cross-user calls.

CREATE OR REPLACE FUNCTION public.get_or_create_daily_stats(p_user_id uuid)
RETURNS daily_stats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result public.daily_stats;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_user' USING ERRCODE = '22023';
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO result
  FROM public.daily_stats
  WHERE user_id = p_user_id AND date = CURRENT_DATE;

  IF NOT FOUND THEN
    INSERT INTO public.daily_stats (user_id, date)
    VALUES (p_user_id, CURRENT_DATE)
    RETURNING * INTO result;
  END IF;

  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.get_or_create_user_status(p_user_id uuid)
RETURNS user_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result public.user_status;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_user' USING ERRCODE = '22023';
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO result FROM public.user_status WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO public.user_status (user_id) VALUES (p_user_id) RETURNING * INTO result;
  END IF;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.update_user_status(
  p_user_id uuid,
  p_status user_status_type,
  p_call_started_at timestamp with time zone DEFAULT NULL
)
RETURNS user_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.user_status;
  v_started timestamptz := p_call_started_at;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_user' USING ERRCODE = '22023';
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Bound timestamp: must be within [-24h, +1min] of now, else drop it.
  IF v_started IS NOT NULL AND
     (v_started < now() - interval '24 hours' OR v_started > now() + interval '1 minute') THEN
    v_started := NULL;
  END IF;

  INSERT INTO public.user_status (user_id, status, current_call_started_at, last_activity_at)
  VALUES (p_user_id, p_status, v_started, now())
  ON CONFLICT (user_id) DO UPDATE SET
    status = p_status,
    current_call_started_at = v_started,
    last_activity_at = now(),
    updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id uuid,
  p_activity_type activity_type,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS activities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_activity public.activities;
  v_meta jsonb := COALESCE(p_metadata, '{}'::jsonb);
  v_duration integer := 0;
  v_value numeric := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_user' USING ERRCODE = '22023';
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(v_meta) <> 'object' THEN
    v_meta := '{}'::jsonb;
  END IF;
  IF octet_length(v_meta::text) > 4096 THEN
    RAISE EXCEPTION 'metadata_too_large' USING ERRCODE = '22023';
  END IF;

  -- Safe numeric extraction (guard against arbitrary cast errors).
  BEGIN
    v_duration := GREATEST(0, LEAST(600, COALESCE((v_meta->>'duration_minutes')::integer, 0)));
  EXCEPTION WHEN others THEN v_duration := 0;
  END;
  BEGIN
    v_value := GREATEST(0, LEAST(10000000, COALESCE((v_meta->>'value')::numeric, 0)));
  EXCEPTION WHEN others THEN v_value := 0;
  END;

  SELECT team_id INTO v_team_id FROM public.profiles WHERE user_id = p_user_id;

  INSERT INTO public.activities (user_id, team_id, activity_type, metadata)
  VALUES (p_user_id, v_team_id, p_activity_type, v_meta)
  RETURNING * INTO v_activity;

  INSERT INTO public.daily_stats (user_id, date)
  VALUES (p_user_id, CURRENT_DATE)
  ON CONFLICT (user_id, date) DO NOTHING;

  CASE p_activity_type
    WHEN 'call_made' THEN
      UPDATE public.daily_stats
      SET calls_made = calls_made + 1,
          talk_time_minutes = talk_time_minutes + v_duration
      WHERE user_id = p_user_id AND date = CURRENT_DATE;
    WHEN 'call_received' THEN
      UPDATE public.daily_stats
      SET calls_received = calls_received + 1,
          talk_time_minutes = talk_time_minutes + v_duration
      WHERE user_id = p_user_id AND date = CURRENT_DATE;
    WHEN 'appointment_set' THEN
      UPDATE public.daily_stats
      SET appointments_set = appointments_set + 1
      WHERE user_id = p_user_id AND date = CURRENT_DATE;
    WHEN 'deal_closed' THEN
      UPDATE public.daily_stats
      SET deals_closed = deals_closed + 1,
          revenue_closed = revenue_closed + v_value
      WHERE user_id = p_user_id AND date = CURRENT_DATE;
    WHEN 'deal_lost' THEN
      UPDATE public.daily_stats
      SET deals_lost = deals_lost + 1
      WHERE user_id = p_user_id AND date = CURRENT_DATE;
    ELSE NULL;
  END CASE;

  RETURN v_activity;
END $$;

CREATE OR REPLACE FUNCTION public.log_team_audit_event(
  p_action text,
  p_target_type text,
  p_target_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team uuid;
  v_id uuid;
  v_action text := btrim(coalesce(p_action, ''));
  v_ttype text := btrim(coalesce(p_target_type, ''));
  v_tid text := NULLIF(btrim(coalesce(p_target_id, '')), '');
  v_meta jsonb := COALESCE(p_metadata, '{}'::jsonb);
BEGIN
  v_team := public.get_user_team_id(auth.uid());
  IF auth.uid() IS NULL OR v_team IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF length(v_action) = 0 OR length(v_action) > 80 THEN
    RAISE EXCEPTION 'invalid_action' USING ERRCODE = '22023';
  END IF;
  IF length(v_ttype) = 0 OR length(v_ttype) > 60 THEN
    RAISE EXCEPTION 'invalid_target_type' USING ERRCODE = '22023';
  END IF;
  IF v_tid IS NOT NULL AND length(v_tid) > 100 THEN
    RAISE EXCEPTION 'invalid_target_id' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(v_meta) <> 'object' THEN
    v_meta := '{}'::jsonb;
  END IF;
  IF octet_length(v_meta::text) > 4096 THEN
    RAISE EXCEPTION 'metadata_too_large' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.audit_events(team_id, actor_id, action, target_type, target_id, metadata)
  VALUES (v_team, auth.uid(), v_action, v_ttype, v_tid, v_meta)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- =========================================================
-- 2) Anon privilege revocation (public schema)
-- =========================================================

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Belt-and-suspenders: prevent future default grants to anon.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;

-- Reaffirm service_role remains full-privileged.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Reaffirm authenticated retains function execution for RPCs.
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
