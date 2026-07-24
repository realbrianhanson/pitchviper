-- =========================================================================
-- Tenant hardening corrections. Fully idempotent.
-- =========================================================================

-- ---------- 1. team_profiles_safe: rebuild + explicit grants ------------
DROP VIEW IF EXISTS public.team_profiles_safe;
CREATE VIEW public.team_profiles_safe
WITH (security_invoker = off, security_barrier = true) AS
SELECT
  p.id,
  p.user_id,
  p.team_id,
  p.full_name,
  p.avatar_url,
  p.title,
  p.current_level,
  p.xp_points,
  p.current_streak,
  p.longest_streak,
  p.hire_date,
  p.phone_extension,
  p.onboarding_completed,
  p.last_coached_at,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE p.team_id IS NOT NULL
  AND p.team_id = public.get_user_team_id(auth.uid());

REVOKE ALL ON public.team_profiles_safe FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.team_profiles_safe TO authenticated;
GRANT SELECT ON public.team_profiles_safe TO service_role;

-- ---------- 2. Atomic team membership RPCs (service-role only) ----------
-- Note: uppercase alphanumerics only, 6-10 chars; matches the edge validator.
CREATE OR REPLACE FUNCTION public.svc_join_team_by_code(
  _user_id uuid,
  _code text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_team_id uuid;
  v_team_name text;
  v_team_code text;
  v_current_team uuid;
  v_updated_count int;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_user' USING ERRCODE = '22023';
  END IF;
  v_code := upper(coalesce(_code, ''));
  IF v_code !~ '^[A-Z0-9]{6,10}$' THEN
    RAISE EXCEPTION 'invalid_code' USING ERRCODE = '22023';
  END IF;

  -- Lock the caller's profile row for the transaction.
  SELECT team_id INTO v_current_team
  FROM public.profiles
  WHERE user_id = _user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_current_team IS NOT NULL THEN
    RAISE EXCEPTION 'already_on_team' USING ERRCODE = '42501';
  END IF;

  SELECT id, name, team_code
    INTO v_team_id, v_team_name, v_team_code
  FROM public.teams
  WHERE team_code = v_code
  LIMIT 1;
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'team_not_found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.profiles
     SET team_id = v_team_id
   WHERE user_id = _user_id
     AND team_id IS NULL;
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  IF v_updated_count <> 1 THEN
    RAISE EXCEPTION 'join_failed' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'team_id', v_team_id,
    'team_name', v_team_name,
    'team_code', v_team_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.svc_create_team(
  _user_id uuid,
  _name text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_current_team uuid;
  v_code text;
  v_team_id uuid;
  v_team_name text;
  v_team_code text;
  v_bytes bytea;
  v_charset text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  v_charset_len int := 36;
  v_i int;
  v_attempt int;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_user' USING ERRCODE = '22023';
  END IF;
  v_name := btrim(coalesce(_name, ''));
  IF length(v_name) < 2 OR length(v_name) > 60 THEN
    RAISE EXCEPTION 'invalid_name' USING ERRCODE = '22023';
  END IF;

  -- Lock the caller's profile row to serialize concurrent attempts.
  SELECT team_id INTO v_current_team
  FROM public.profiles
  WHERE user_id = _user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_current_team IS NOT NULL THEN
    RAISE EXCEPTION 'already_on_team' USING ERRCODE = '42501';
  END IF;

  -- Generate a cryptographically strong 10-char code with unique retry.
  FOR v_attempt IN 1..8 LOOP
    v_bytes := gen_random_bytes(10);
    v_code := '';
    FOR v_i IN 0..9 LOOP
      v_code := v_code || substr(v_charset, (get_byte(v_bytes, v_i) % v_charset_len) + 1, 1);
    END LOOP;
    BEGIN
      INSERT INTO public.teams(name, team_code, created_by)
      VALUES (v_name, v_code, _user_id)
      RETURNING id, name, team_code
        INTO v_team_id, v_team_name, v_team_code;
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        v_team_id := NULL;
        CONTINUE;
    END;
  END LOOP;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'code_allocation_failed' USING ERRCODE = 'P0001';
  END IF;

  -- The AFTER INSERT trigger promote_team_creator_to_manager attaches the
  -- team to the caller profile and grants the manager role.
  RETURN jsonb_build_object(
    'team_id', v_team_id,
    'team_name', v_team_name,
    'team_code', v_team_code
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.svc_join_team_by_code(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.svc_create_team(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.svc_join_team_by_code(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.svc_create_team(uuid, text) TO service_role;

-- ---------- 4. Event-bound XP awards ------------------------------------
CREATE TABLE IF NOT EXISTS public.xp_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text NOT NULL,
  source_id uuid NOT NULL,
  amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT xp_awards_unique_event UNIQUE (user_id, reason, source_id)
);
REVOKE ALL ON public.xp_awards FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.xp_awards TO service_role;
ALTER TABLE public.xp_awards ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role can access via GRANT.

-- Drop the arbitrary self-award function (both possible signatures).
DROP FUNCTION IF EXISTS public.award_user_xp(integer);
DROP FUNCTION IF EXISTS public.award_user_xp(int);

CREATE OR REPLACE FUNCTION public.award_event_xp(
  _reason text,
  _source_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_amount int;
  v_new_total int;
  v_call_owner uuid;
  v_completion RECORD;
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

  -- Ledger insert is the idempotency gate. Unique violation → already awarded.
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
$$;

REVOKE EXECUTE ON FUNCTION public.award_event_xp(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_event_xp(text, uuid) TO authenticated;

-- ---------- 5. Policy tightening ----------------------------------------
DROP POLICY IF EXISTS "Managers can delete their competitions" ON public.competitions;
CREATE POLICY "Managers can delete their competitions"
  ON public.competitions
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND team_id = public.get_user_team_id(auth.uid())
    AND public.has_management_role(auth.uid())
  );

DROP POLICY IF EXISTS "Team creators can update their team" ON public.teams;
CREATE POLICY "Team creators can update their team"
  ON public.teams
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND id = public.get_user_team_id(auth.uid())
    AND public.has_management_role(auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid()
    AND id = public.get_user_team_id(auth.uid())
    AND public.has_management_role(auth.uid())
  );
