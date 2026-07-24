
-- === 1. Corrected entitlement state machine ================================
CREATE OR REPLACE FUNCTION public.compute_entitlement(
  p_billing public.team_billing
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $fn$
DECLARE
  v_now timestamptz := now();
  v_trial_end timestamptz := p_billing.trial_ends_at;
  v_period_end timestamptz := p_billing.current_period_end;
  v_status text := p_billing.status;
  v_plan text := coalesce(p_billing.plan, 'starter');
  v_interval text := coalesce(p_billing.billing_interval, 'monthly');
  v_seats int := coalesce(p_billing.seat_limit, 25);
  v_sub_id text := p_billing.stripe_subscription_id;
  v_cape boolean := coalesce(p_billing.cancel_at_period_end, false);
  v_access boolean := false;
  v_reason text := 'expired';
  v_tier text := 'starter';
  v_known_plan boolean := v_plan IN ('trial','starter','growth');
BEGIN
  -- Unknown/invalid plan: fail closed.
  IF NOT v_known_plan THEN
    RETURN jsonb_build_object(
      'access', false, 'reason', 'unknown_status',
      'plan','starter','tier','starter','interval',v_interval,
      'status', coalesce(v_status,'unknown'),
      'trial_ends_at', v_trial_end,
      'current_period_end', v_period_end,
      'cancel_at_period_end', v_cape,
      'seat_limit', 0
    );
  END IF;

  IF v_status IN ('trial','trialing') THEN
    -- Internal 14-day no-card trial: full growth features, 25 seats, no sub required.
    -- Stripe 'trialing' with a real subscription id is also allowed.
    IF v_trial_end IS NOT NULL AND v_trial_end > v_now THEN
      v_access := true; v_reason := 'trial'; v_tier := 'growth';
      -- Internal trial soft-caps at 25 seats; Stripe trialing respects sub qty.
      IF v_sub_id IS NULL THEN
        v_seats := 25;
      END IF;
    ELSE
      v_access := false; v_reason := 'trial_expired';
    END IF;

  ELSIF v_status = 'active' THEN
    -- Real active subscription only.
    IF v_sub_id IS NULL OR v_plan NOT IN ('starter','growth') THEN
      v_access := false; v_reason := 'unknown_status';
    ELSIF v_cape THEN
      IF v_period_end IS NOT NULL AND v_period_end > v_now THEN
        v_access := true; v_reason := 'cancel_at_period_end';
        v_tier := CASE WHEN v_plan = 'growth' THEN 'growth' ELSE 'starter' END;
      ELSE
        v_access := false; v_reason := 'expired';
      END IF;
    ELSE
      v_access := true; v_reason := 'active';
      v_tier := CASE WHEN v_plan = 'growth' THEN 'growth' ELSE 'starter' END;
    END IF;

  ELSIF v_status = 'past_due' THEN
    -- Only valid with real sub AND real period_end. No self-renewing grace.
    IF v_sub_id IS NOT NULL AND v_period_end IS NOT NULL
       AND (v_period_end + interval '3 days') > v_now THEN
      v_access := true; v_reason := 'past_due_grace';
      v_tier := CASE WHEN v_plan = 'growth' THEN 'growth' ELSE 'starter' END;
    ELSE
      v_access := false; v_reason := 'expired';
    END IF;

  ELSIF v_status IN ('canceled','unpaid','incomplete','incomplete_expired','paused') THEN
    v_access := false; v_reason := 'expired';
  ELSE
    v_access := false; v_reason := 'unknown_status';
  END IF;

  RETURN jsonb_build_object(
    'access', v_access,
    'reason', v_reason,
    'plan', v_plan,
    'tier', v_tier,
    'interval', v_interval,
    'status', v_status,
    'trial_ends_at', v_trial_end,
    'current_period_end', v_period_end,
    'cancel_at_period_end', v_cape,
    'seat_limit', v_seats
  );
END $fn$;

-- === 2. Seat reservations ==================================================
CREATE TABLE IF NOT EXISTS public.seat_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  target_hash text NOT NULL,
  requested_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  consumed_at timestamptz,
  UNIQUE (team_id, target_hash)
);

GRANT SELECT ON public.seat_reservations TO service_role;
GRANT ALL   ON public.seat_reservations TO service_role;
REVOKE ALL  ON public.seat_reservations FROM anon, authenticated;

ALTER TABLE public.seat_reservations ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated/anon → locked. service_role bypasses.

CREATE INDEX IF NOT EXISTS seat_reservations_team_pending_idx
  ON public.seat_reservations(team_id)
  WHERE consumed_at IS NULL;

-- Count effective usage: active team members + live pending reservations.
CREATE OR REPLACE FUNCTION public.effective_seat_usage(p_team_id uuid)
RETURNS int
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_profiles int; v_pending int;
BEGIN
  SELECT count(*) INTO v_profiles FROM public.profiles WHERE team_id = p_team_id;
  SELECT count(*) INTO v_pending
    FROM public.seat_reservations
    WHERE team_id = p_team_id
      AND consumed_at IS NULL
      AND expires_at > now();
  RETURN v_profiles + coalesce(v_pending, 0);
END $$;
REVOKE ALL ON FUNCTION public.effective_seat_usage(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.effective_seat_usage(uuid) TO service_role;

-- Update seat check to use effective usage.
CREATE OR REPLACE FUNCTION public.check_team_seat_available(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_billing public.team_billing; v_ent jsonb; v_used int; v_limit int;
  v_is_trial boolean := false;
BEGIN
  IF p_team_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_team');
  END IF;
  SELECT * INTO v_billing FROM public.team_billing WHERE team_id = p_team_id LIMIT 1;
  IF v_billing.team_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'no_billing');
  END IF;
  v_ent := public.compute_entitlement(v_billing);
  IF NOT (v_ent->>'access')::boolean THEN
    RETURN jsonb_build_object('ok', false, 'code', 'subscription_required');
  END IF;
  v_is_trial := (v_ent->>'reason') = 'trial';
  v_limit := (v_ent->>'seat_limit')::int;
  v_used := public.effective_seat_usage(p_team_id);
  IF v_used >= v_limit THEN
    RETURN jsonb_build_object('ok', false, 'code', 'seat_limit_reached',
      'used', v_used, 'limit', v_limit, 'is_trial', v_is_trial);
  END IF;
  RETURN jsonb_build_object('ok', true,
    'used', v_used, 'limit', v_limit, 'is_trial', v_is_trial);
END $fn$;

-- Reserve a seat atomically. p_target_hash keys pending invites (SHA256 of email
-- would be computed in edge fn). Returns {ok, reservation_id} or {ok:false, code}.
CREATE OR REPLACE FUNCTION public.svc_reserve_seat(
  p_team_id uuid, p_target_hash text, p_requested_by uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_billing public.team_billing; v_ent jsonb; v_limit int; v_used int;
  v_id uuid; v_existing public.seat_reservations;
BEGIN
  IF p_team_id IS NULL OR p_target_hash IS NULL OR length(p_target_hash) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_args');
  END IF;

  -- Lock billing row for the duration.
  SELECT * INTO v_billing FROM public.team_billing WHERE team_id = p_team_id FOR UPDATE;
  IF v_billing.team_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'no_billing');
  END IF;
  v_ent := public.compute_entitlement(v_billing);
  IF NOT (v_ent->>'access')::boolean THEN
    RETURN jsonb_build_object('ok', false, 'code', 'subscription_required');
  END IF;
  v_limit := (v_ent->>'seat_limit')::int;

  -- Existing live reservation for the same (team, target) is a no-op reuse.
  SELECT * INTO v_existing FROM public.seat_reservations
   WHERE team_id = p_team_id AND target_hash = p_target_hash
   FOR UPDATE;
  IF FOUND THEN
    IF v_existing.consumed_at IS NULL AND v_existing.expires_at > now() THEN
      RETURN jsonb_build_object('ok', true, 'reservation_id', v_existing.id, 'reused', true);
    END IF;
    -- Expired/consumed: drop and reissue below.
    DELETE FROM public.seat_reservations WHERE id = v_existing.id;
  END IF;

  v_used := public.effective_seat_usage(p_team_id);
  IF v_used >= v_limit THEN
    RETURN jsonb_build_object('ok', false, 'code', 'seat_limit_reached',
      'used', v_used, 'limit', v_limit);
  END IF;

  INSERT INTO public.seat_reservations(team_id, target_hash, requested_by)
  VALUES (p_team_id, p_target_hash, p_requested_by)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'reservation_id', v_id, 'reused', false);
END $fn$;
REVOKE ALL ON FUNCTION public.svc_reserve_seat(uuid, text, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.svc_reserve_seat(uuid, text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.svc_consume_reservation(p_reservation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_updated int;
BEGIN
  UPDATE public.seat_reservations
     SET consumed_at = now()
   WHERE id = p_reservation_id
     AND consumed_at IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  DELETE FROM public.seat_reservations
   WHERE id = p_reservation_id AND consumed_at IS NOT NULL;
  RETURN v_updated = 1;
END $$;
REVOKE ALL ON FUNCTION public.svc_consume_reservation(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.svc_consume_reservation(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.svc_release_reservation(p_reservation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.seat_reservations
   WHERE id = p_reservation_id AND consumed_at IS NULL;
END $$;
REVOKE ALL ON FUNCTION public.svc_release_reservation(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.svc_release_reservation(uuid) TO service_role;

-- === 3. Race-safe join-by-code ==============================================
CREATE OR REPLACE FUNCTION public.svc_join_team_by_code(_user_id uuid, _code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_code text;
  v_team_id uuid; v_team_name text; v_team_code text;
  v_current_team uuid;
  v_billing public.team_billing; v_ent jsonb;
  v_used int; v_limit int;
  v_updated_count int;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_user' USING ERRCODE = '22023';
  END IF;
  v_code := upper(coalesce(_code, ''));
  IF v_code !~ '^[A-Z0-9]{6,10}$' THEN
    RAISE EXCEPTION 'invalid_code' USING ERRCODE = '22023';
  END IF;

  SELECT team_id INTO v_current_team FROM public.profiles WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_current_team IS NOT NULL THEN
    RAISE EXCEPTION 'already_on_team' USING ERRCODE = '42501';
  END IF;

  SELECT id, name, team_code INTO v_team_id, v_team_name, v_team_code
    FROM public.teams WHERE team_code = v_code LIMIT 1;
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'team_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Lock billing row + evaluate entitlement + seat limit atomically.
  SELECT * INTO v_billing FROM public.team_billing WHERE team_id = v_team_id FOR UPDATE;
  IF v_billing.team_id IS NULL THEN
    RAISE EXCEPTION 'subscription_required' USING ERRCODE = '42501';
  END IF;
  v_ent := public.compute_entitlement(v_billing);
  IF NOT (v_ent->>'access')::boolean THEN
    RAISE EXCEPTION 'subscription_required' USING ERRCODE = '42501';
  END IF;
  v_limit := (v_ent->>'seat_limit')::int;
  v_used := public.effective_seat_usage(v_team_id);
  IF v_used >= v_limit THEN
    RAISE EXCEPTION 'seat_limit_reached' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles SET team_id = v_team_id
   WHERE user_id = _user_id AND team_id IS NULL;
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  IF v_updated_count <> 1 THEN
    RAISE EXCEPTION 'join_failed' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'team_id', v_team_id,
    'team_name', v_team_name,
    'team_code', v_team_code
  );
END $fn$;

-- === 4. Active-entitlement triggers on all browser-writable operational tables
-- Reuses existing enforce_active_entitlement function.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'calls','sms_messages','sos_alerts','objections','coaching_sessions',
    'coaching_actions','team_broadcasts','chat_messages','chat_reactions',
    'notifications','user_module_progress','user_challenge_progress',
    'user_gauntlet_completions','deal_stage_history'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS trg_%I_active_gate ON public.%I;', t, t
      );
      EXECUTE format(
        'CREATE TRIGGER trg_%I_active_gate BEFORE INSERT OR UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.enforce_active_entitlement();',
         t, t
      );
    END IF;
  END LOOP;
END $$;

-- === 5. Lock down daily_stats + user_status direct writes ==================
-- Force all writes through hardened RPCs. SELECT policies remain intact.
DROP POLICY IF EXISTS "Users can insert own daily stats" ON public.daily_stats;
DROP POLICY IF EXISTS "Users can update own daily stats" ON public.daily_stats;
REVOKE INSERT, UPDATE, DELETE ON public.daily_stats FROM authenticated, anon;

DROP POLICY IF EXISTS "Users can insert own status" ON public.user_status;
DROP POLICY IF EXISTS "Users can update own status" ON public.user_status;
REVOKE INSERT, UPDATE, DELETE ON public.user_status FROM authenticated, anon;

-- === 6. Cleanup helper for expired reservations ============================
CREATE OR REPLACE FUNCTION public.cleanup_expired_seat_reservations()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int;
BEGIN
  DELETE FROM public.seat_reservations
   WHERE (consumed_at IS NOT NULL AND consumed_at < now() - interval '1 day')
      OR (consumed_at IS NULL AND expires_at < now() - interval '1 hour');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.cleanup_expired_seat_reservations() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_seat_reservations() TO service_role;
