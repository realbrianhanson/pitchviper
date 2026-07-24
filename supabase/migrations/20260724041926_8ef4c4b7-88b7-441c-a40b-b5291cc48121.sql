
-- === Entitlement layer =====================================================
-- Derives access/plan/seats server-side from auth.uid() -> profile.team_id
-- -> team_billing. Fail-closed everywhere; never trust client input.

-- Type used by the trigger + RPC to describe the resolved state.
DO $$ BEGIN
  CREATE TYPE public.entitlement_reason AS ENUM (
    'ok','trial','trial_expired','active','cancel_at_period_end',
    'past_due_grace','no_team','no_billing','expired','unknown_status'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Effective feature tier: starter < growth. Trial always maps to 'growth'.
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
  v_access boolean := false;
  v_reason text := 'expired';
  v_tier text := 'starter';
  v_grace_end timestamptz;
BEGIN
  -- Trial (14-day, no card, full growth features, 25-seat soft cap).
  IF v_status = 'trial' OR v_status = 'trialing' THEN
    IF v_trial_end IS NOT NULL AND v_trial_end > v_now THEN
      v_access := true; v_reason := 'trial'; v_tier := 'growth';
      v_seats := 25;
    ELSE
      v_access := false; v_reason := 'trial_expired';
    END IF;
  ELSIF v_status = 'active' THEN
    v_access := true;
    v_tier := CASE WHEN v_plan = 'growth' THEN 'growth' ELSE 'starter' END;
    IF p_billing.cancel_at_period_end = true
       AND v_period_end IS NOT NULL AND v_period_end > v_now THEN
      v_reason := 'cancel_at_period_end';
    ELSIF p_billing.cancel_at_period_end = true THEN
      v_access := false; v_reason := 'expired';
    ELSE
      v_reason := 'active';
    END IF;
  ELSIF v_status = 'past_due' THEN
    v_grace_end := coalesce(v_period_end, v_now) + interval '3 days';
    IF v_grace_end > v_now THEN
      v_access := true; v_reason := 'past_due_grace';
      v_tier := CASE WHEN v_plan = 'growth' THEN 'growth' ELSE 'starter' END;
    ELSE
      v_access := false; v_reason := 'expired';
    END IF;
  ELSE
    v_access := false; v_reason := 'expired';
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
    'cancel_at_period_end', coalesce(p_billing.cancel_at_period_end, false),
    'seat_limit', v_seats
  );
END $fn$;

-- Caller-scoped entitlement for the currently authenticated user.
-- Returns a jsonb envelope with used_seats + can_manage.
CREATE OR REPLACE FUNCTION public.get_my_entitlement()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_team uuid;
  v_billing public.team_billing;
  v_used int := 0;
  v_can_manage boolean := false;
  v_ent jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('access', false, 'reason', 'unauthenticated');
  END IF;
  SELECT team_id INTO v_team FROM public.profiles WHERE user_id = v_uid LIMIT 1;
  IF v_team IS NULL THEN
    RETURN jsonb_build_object(
      'access', false, 'reason', 'no_team',
      'plan','starter','tier','starter','seat_limit',0,'used_seats',0,
      'can_manage', false
    );
  END IF;
  SELECT * INTO v_billing FROM public.team_billing WHERE team_id = v_team LIMIT 1;
  v_can_manage := public.has_management_role(v_uid);
  SELECT count(*) INTO v_used FROM public.profiles WHERE team_id = v_team;

  IF v_billing.team_id IS NULL THEN
    RETURN jsonb_build_object(
      'access', false, 'reason', 'no_billing',
      'plan','starter','tier','starter','seat_limit',0,'used_seats',v_used,
      'can_manage', v_can_manage
    );
  END IF;
  v_ent := public.compute_entitlement(v_billing);
  RETURN v_ent
      || jsonb_build_object('used_seats', v_used, 'can_manage', v_can_manage);
END $fn$;

GRANT EXECUTE ON FUNCTION public.get_my_entitlement() TO authenticated;

-- Service-role helper for edge functions: resolves entitlement for a given
-- user id and asserts minimum tier. Returns jsonb {ok, ent} or {ok:false,code}.
CREATE OR REPLACE FUNCTION public.check_team_entitlement(
  p_user_id uuid, p_min_tier text DEFAULT 'starter'
) RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_team uuid; v_billing public.team_billing; v_ent jsonb;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'unauthenticated');
  END IF;
  SELECT team_id INTO v_team FROM public.profiles WHERE user_id = p_user_id LIMIT 1;
  IF v_team IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'no_team');
  END IF;
  SELECT * INTO v_billing FROM public.team_billing WHERE team_id = v_team LIMIT 1;
  IF v_billing.team_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'no_billing');
  END IF;
  v_ent := public.compute_entitlement(v_billing);
  IF NOT (v_ent->>'access')::boolean THEN
    RETURN jsonb_build_object('ok', false, 'code', 'subscription_required', 'ent', v_ent, 'team_id', v_team);
  END IF;
  IF p_min_tier = 'growth' AND (v_ent->>'tier') <> 'growth' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'upgrade_required', 'ent', v_ent, 'team_id', v_team);
  END IF;
  RETURN jsonb_build_object('ok', true, 'ent', v_ent, 'team_id', v_team);
END $fn$;

REVOKE ALL ON FUNCTION public.check_team_entitlement(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_team_entitlement(uuid, text) TO service_role;

-- Seat availability check: returns json {ok, used, limit, is_trial}.
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
  SELECT count(*) INTO v_used FROM public.profiles WHERE team_id = p_team_id;
  IF v_used >= v_limit THEN
    RETURN jsonb_build_object('ok', false, 'code', 'seat_limit_reached',
      'used', v_used, 'limit', v_limit, 'is_trial', v_is_trial);
  END IF;
  RETURN jsonb_build_object('ok', true,
    'used', v_used, 'limit', v_limit, 'is_trial', v_is_trial);
END $fn$;

REVOKE ALL ON FUNCTION public.check_team_seat_available(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_team_seat_available(uuid) TO service_role;

-- Server-side trigger: block INSERT/UPDATE/DELETE on Growth-only tables when
-- the team lacks the Growth entitlement. service_role bypasses.
CREATE OR REPLACE FUNCTION public.enforce_growth_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_team uuid;
  v_billing public.team_billing;
  v_ent jsonb;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'subscription_required' USING ERRCODE = '42501';
  END IF;
  SELECT team_id INTO v_team FROM public.profiles WHERE user_id = v_uid LIMIT 1;
  IF v_team IS NULL THEN
    RAISE EXCEPTION 'subscription_required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_billing FROM public.team_billing WHERE team_id = v_team LIMIT 1;
  IF v_billing.team_id IS NULL THEN
    RAISE EXCEPTION 'subscription_required' USING ERRCODE = '42501';
  END IF;
  v_ent := public.compute_entitlement(v_billing);
  IF NOT (v_ent->>'access')::boolean THEN
    RAISE EXCEPTION 'subscription_required' USING ERRCODE = '42501';
  END IF;
  IF (v_ent->>'tier') <> 'growth' THEN
    RAISE EXCEPTION 'upgrade_required' USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $fn$;

DROP TRIGGER IF EXISTS trg_competitions_growth_gate ON public.competitions;
CREATE TRIGGER trg_competitions_growth_gate
BEFORE INSERT OR UPDATE OR DELETE ON public.competitions
FOR EACH ROW EXECUTE FUNCTION public.enforce_growth_entitlement();

DROP TRIGGER IF EXISTS trg_competition_participants_growth_gate ON public.competition_participants;
CREATE TRIGGER trg_competition_participants_growth_gate
BEFORE INSERT OR UPDATE ON public.competition_participants
FOR EACH ROW EXECUTE FUNCTION public.enforce_growth_entitlement();

-- Generic access trigger: blocks writes on cost-bearing tenant tables when
-- the team has no active entitlement (any tier). service_role bypasses so
-- webhooks / scheduled sync jobs keep working.
CREATE OR REPLACE FUNCTION public.enforce_active_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_team uuid;
  v_billing public.team_billing;
  v_ent jsonb;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'subscription_required' USING ERRCODE = '42501';
  END IF;
  SELECT team_id INTO v_team FROM public.profiles WHERE user_id = v_uid LIMIT 1;
  IF v_team IS NULL THEN
    RAISE EXCEPTION 'subscription_required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_billing FROM public.team_billing WHERE team_id = v_team LIMIT 1;
  IF v_billing.team_id IS NULL THEN
    RAISE EXCEPTION 'subscription_required' USING ERRCODE = '42501';
  END IF;
  v_ent := public.compute_entitlement(v_billing);
  IF NOT (v_ent->>'access')::boolean THEN
    RAISE EXCEPTION 'subscription_required' USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $fn$;

-- Apply to core tenant operational tables. Read remains unaffected so
-- managers can export/recover. Excludes billing/profile/auth/setup tables.
DO $$ BEGIN
  PERFORM 1;
  DROP TRIGGER IF EXISTS trg_deals_active_gate ON public.deals;
  CREATE TRIGGER trg_deals_active_gate
    BEFORE INSERT OR UPDATE OR DELETE ON public.deals
    FOR EACH ROW EXECUTE FUNCTION public.enforce_active_entitlement();

  DROP TRIGGER IF EXISTS trg_roleplay_sessions_active_gate ON public.roleplay_sessions;
  CREATE TRIGGER trg_roleplay_sessions_active_gate
    BEFORE INSERT OR UPDATE ON public.roleplay_sessions
    FOR EACH ROW EXECUTE FUNCTION public.enforce_active_entitlement();

  DROP TRIGGER IF EXISTS trg_activities_active_gate ON public.activities;
  CREATE TRIGGER trg_activities_active_gate
    BEFORE INSERT OR UPDATE ON public.activities
    FOR EACH ROW EXECUTE FUNCTION public.enforce_active_entitlement();
END $$;
