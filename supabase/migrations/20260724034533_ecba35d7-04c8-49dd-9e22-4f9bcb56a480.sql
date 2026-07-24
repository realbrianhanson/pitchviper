
-- =========================================================
-- 1) Roleplay analysis claim table (service-only)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.roleplay_analysis_claims (
  session_id uuid PRIMARY KEY REFERENCES public.roleplay_sessions(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.roleplay_analysis_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.roleplay_analysis_claims FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.roleplay_analysis_claims TO service_role;

-- =========================================================
-- 2) Lock down user_gauntlet_completions to server-only writes
-- =========================================================
DROP POLICY IF EXISTS "Users can create their own completions" ON public.user_gauntlet_completions;
DROP POLICY IF EXISTS "Users can update their own completions" ON public.user_gauntlet_completions;

REVOKE INSERT, UPDATE, DELETE ON public.user_gauntlet_completions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_gauntlet_completions TO authenticated;
GRANT ALL ON public.user_gauntlet_completions TO service_role;

-- =========================================================
-- 3) Lock down roleplay_sessions writes (except create + read)
-- =========================================================
DROP POLICY IF EXISTS "Users can update own sessions" ON public.roleplay_sessions;

REVOKE UPDATE, DELETE ON public.roleplay_sessions FROM PUBLIC, anon, authenticated;
-- Keep the existing INSERT/SELECT policies + grants.
GRANT SELECT, INSERT ON public.roleplay_sessions TO authenticated;
GRANT ALL ON public.roleplay_sessions TO service_role;

-- =========================================================
-- 4) Extend award_event_xp to accept roleplay_completed
-- =========================================================
CREATE OR REPLACE FUNCTION public.award_event_xp(_reason text, _source_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_amount int;
  v_new_total int;
  v_call_owner uuid;
  v_completion RECORD;
  v_session RECORD;
  v_challenge_reward int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;
  IF _source_id IS NULL THEN
    RAISE EXCEPTION 'invalid_source' USING ERRCODE = '22023';
  END IF;

  IF _reason = 'call_logged' THEN
    SELECT user_id INTO v_call_owner FROM public.calls WHERE id = _source_id;
    IF v_call_owner IS NULL OR v_call_owner <> v_user THEN
      RAISE EXCEPTION 'source_not_found' USING ERRCODE = 'P0002';
    END IF;
    v_amount := 10;

  ELSIF _reason = 'gauntlet_passed' THEN
    SELECT c.user_id, c.passed, c.score, c.challenge_id, dc.xp_reward
      INTO v_completion
      FROM public.user_gauntlet_completions c
      LEFT JOIN public.gauntlet_challenges dc ON dc.id = c.challenge_id
     WHERE c.id = _source_id;
    IF v_completion.user_id IS NULL OR v_completion.user_id <> v_user THEN
      RAISE EXCEPTION 'source_not_found' USING ERRCODE = 'P0002';
    END IF;
    IF v_completion.passed IS NOT TRUE THEN
      RAISE EXCEPTION 'source_not_awardable' USING ERRCODE = '22023';
    END IF;
    v_challenge_reward := COALESCE(v_completion.xp_reward, 0);
    v_amount := v_challenge_reward + CASE WHEN v_completion.score = 100 THEN 25 ELSE 0 END;

  ELSE
    RAISE EXCEPTION 'invalid_reason' USING ERRCODE = '22023';
  END IF;

  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = '22023';
  END IF;

  BEGIN
    INSERT INTO public.xp_awards(user_id, reason, source_id, amount)
    VALUES (v_user, _reason, _source_id, v_amount);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('awarded', false, 'amount', 0);
  END;

  UPDATE public.profiles
     SET xp_points = xp_points + v_amount,
         updated_at = now()
   WHERE user_id = v_user
  RETURNING xp_points INTO v_new_total;
  IF v_new_total IS NULL THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object('awarded', true, 'amount', v_amount, 'total', v_new_total);
END;
$function$;

-- =========================================================
-- 5) Service-only: upsert gauntlet completion
-- =========================================================
CREATE OR REPLACE FUNCTION public.svc_upsert_gauntlet_completion(
  _user_id uuid,
  _challenge_id uuid,
  _score int,
  _passed boolean,
  _responses jsonb,
  _feedback jsonb,
  _skipped boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_row public.user_gauntlet_completions;
BEGIN
  IF _user_id IS NULL OR _challenge_id IS NULL THEN
    RAISE EXCEPTION 'invalid_args' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_gauntlet_completions(
    user_id, challenge_id, score, passed, attempts, responses, feedback, completed_at
  )
  VALUES (
    _user_id, _challenge_id,
    GREATEST(0, LEAST(100, COALESCE(_score, 0))),
    COALESCE(_passed, false),
    CASE WHEN _skipped THEN 0 ELSE 1 END,
    COALESCE(_responses, '{}'::jsonb),
    COALESCE(_feedback, '{}'::jsonb),
    now()
  )
  ON CONFLICT (user_id, challenge_id) DO UPDATE
    SET score = GREATEST(0, LEAST(100, COALESCE(EXCLUDED.score, 0))),
        passed = COALESCE(EXCLUDED.passed, false),
        attempts = CASE
                     WHEN _skipped THEN public.user_gauntlet_completions.attempts
                     ELSE public.user_gauntlet_completions.attempts + 1
                   END,
        responses = COALESCE(EXCLUDED.responses, '{}'::jsonb),
        feedback = COALESCE(EXCLUDED.feedback, '{}'::jsonb),
        completed_at = now()
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'user_id', v_row.user_id,
    'challenge_id', v_row.challenge_id,
    'score', v_row.score,
    'passed', v_row.passed,
    'attempts', v_row.attempts,
    'completed_at', v_row.completed_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.svc_upsert_gauntlet_completion(uuid,uuid,int,boolean,jsonb,jsonb,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.svc_upsert_gauntlet_completion(uuid,uuid,int,boolean,jsonb,jsonb,boolean) TO service_role;

-- =========================================================
-- 6) Service-only: claim / finalize / release roleplay analysis
-- =========================================================
CREATE OR REPLACE FUNCTION public.svc_claim_roleplay_analysis(
  _session_id uuid,
  _user_id uuid,
  _stale_after interval DEFAULT interval '5 minutes'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_session RECORD;
  v_claim   RECORD;
BEGIN
  IF _session_id IS NULL OR _user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_args' USING ERRCODE = '22023';
  END IF;

  SELECT id, user_id, status, score, feedback, duration_seconds, completed_at
    INTO v_session
    FROM public.roleplay_sessions
   WHERE id = _session_id
   FOR UPDATE;

  IF v_session.id IS NULL THEN
    RAISE EXCEPTION 'session_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_session.user_id <> _user_id THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_session.status = 'completed' THEN
    RETURN jsonb_build_object(
      'status', 'completed',
      'score', v_session.score,
      'feedback', v_session.feedback,
      'duration_seconds', v_session.duration_seconds,
      'completed_at', v_session.completed_at
    );
  END IF;

  IF v_session.status <> 'in_progress' THEN
    RAISE EXCEPTION 'session_not_analyzable' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_claim FROM public.roleplay_analysis_claims WHERE session_id = _session_id FOR UPDATE;

  IF v_claim.session_id IS NOT NULL AND v_claim.updated_at >= now() - _stale_after THEN
    RETURN jsonb_build_object('status', 'processing');
  END IF;

  INSERT INTO public.roleplay_analysis_claims(session_id, user_id)
  VALUES (_session_id, _user_id)
  ON CONFLICT (session_id) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        claimed_at = now(),
        updated_at = now();

  RETURN jsonb_build_object('status', 'claimed');
END;
$function$;

REVOKE ALL ON FUNCTION public.svc_claim_roleplay_analysis(uuid,uuid,interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.svc_claim_roleplay_analysis(uuid,uuid,interval) TO service_role;

CREATE OR REPLACE FUNCTION public.svc_release_roleplay_claim(_session_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.roleplay_analysis_claims
   WHERE session_id = _session_id AND user_id = _user_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.svc_release_roleplay_claim(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.svc_release_roleplay_claim(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.svc_finalize_roleplay_analysis(
  _session_id uuid,
  _user_id uuid,
  _outcome text,
  _overall_score int,
  _feedback jsonb,
  _duration_seconds int,
  _xp_amount int,
  _scenario_name text,
  _scenario_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_session RECORD;
  v_updated int;
  v_amount int := GREATEST(0, COALESCE(_xp_amount, 0));
  v_awarded boolean := false;
  v_score int := GREATEST(0, LEAST(100, COALESCE(_overall_score, 0)));
  v_dur int := GREATEST(0, COALESCE(_duration_seconds, 0));
  v_team uuid;
BEGIN
  IF _session_id IS NULL OR _user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_args' USING ERRCODE = '22023';
  END IF;

  SELECT id, user_id, status INTO v_session
    FROM public.roleplay_sessions
   WHERE id = _session_id
   FOR UPDATE;

  IF v_session.id IS NULL THEN
    RAISE EXCEPTION 'session_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_session.user_id <> _user_id THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- If already completed, treat as idempotent no-op.
  IF v_session.status = 'completed' THEN
    DELETE FROM public.roleplay_analysis_claims WHERE session_id = _session_id;
    RETURN jsonb_build_object('finalized', false, 'awarded', false, 'amount', 0);
  END IF;

  UPDATE public.roleplay_sessions
     SET status = 'completed',
         score = v_score,
         feedback = _feedback::text,
         duration_seconds = v_dur,
         completed_at = now()
   WHERE id = _session_id
     AND status = 'in_progress';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'finalize_failed' USING ERRCODE = 'P0001';
  END IF;

  -- Idempotent XP ledger insert
  IF v_amount > 0 THEN
    BEGIN
      INSERT INTO public.xp_awards(user_id, reason, source_id, amount)
      VALUES (_user_id, 'roleplay_completed', _session_id, v_amount);
      v_awarded := true;
    EXCEPTION WHEN unique_violation THEN
      v_awarded := false;
    END;

    IF v_awarded THEN
      UPDATE public.profiles
         SET xp_points = COALESCE(xp_points, 0) + v_amount,
             updated_at = now()
       WHERE user_id = _user_id;
    END IF;
  END IF;

  -- One activity entry, only when we actually flipped in_progress -> completed
  SELECT team_id INTO v_team FROM public.profiles WHERE user_id = _user_id;
  INSERT INTO public.activities(user_id, team_id, activity_type, metadata)
  VALUES (
    _user_id, v_team, 'roleplay_completed',
    jsonb_build_object(
      'scenario_id', _scenario_id,
      'scenario_name', _scenario_name,
      'score', v_score,
      'outcome', COALESCE(_outcome,'progress'),
      'xp_earned', CASE WHEN v_awarded THEN v_amount ELSE 0 END,
      'duration_seconds', v_dur
    )
  );

  DELETE FROM public.roleplay_analysis_claims WHERE session_id = _session_id;

  RETURN jsonb_build_object(
    'finalized', true,
    'awarded', v_awarded,
    'amount', CASE WHEN v_awarded THEN v_amount ELSE 0 END
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.svc_finalize_roleplay_analysis(uuid,uuid,text,int,jsonb,int,int,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.svc_finalize_roleplay_analysis(uuid,uuid,text,int,jsonb,int,int,text,uuid) TO service_role;

-- =========================================================
-- 7) Service-only: abandon roleplay session
-- =========================================================
CREATE OR REPLACE FUNCTION public.svc_abandon_roleplay_session(
  _session_id uuid,
  _user_id uuid,
  _duration_seconds int DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_updated int;
BEGIN
  IF _session_id IS NULL OR _user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_args' USING ERRCODE = '22023';
  END IF;

  UPDATE public.roleplay_sessions
     SET status = 'abandoned',
         duration_seconds = COALESCE(_duration_seconds, duration_seconds),
         completed_at = COALESCE(completed_at, now())
   WHERE id = _session_id
     AND user_id = _user_id
     AND status = 'in_progress';
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  DELETE FROM public.roleplay_analysis_claims
   WHERE session_id = _session_id AND user_id = _user_id;

  RETURN jsonb_build_object('abandoned', v_updated = 1);
END;
$function$;

REVOKE ALL ON FUNCTION public.svc_abandon_roleplay_session(uuid,uuid,int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.svc_abandon_roleplay_session(uuid,uuid,int) TO service_role;
