-- =========================================================================
-- Bounded security hardening: tenant membership, profile privacy,
-- tenant-tagged writes. Fully idempotent.
-- =========================================================================

-- ---------- A. Profiles: column-level UPDATE grant ----------------------
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (
  full_name,
  avatar_url,
  title,
  phone_extension,
  hire_date,
  onboarding_completed,
  default_aloware_line,
  updated_at
) ON public.profiles TO authenticated;
-- Retain SELECT/INSERT/DELETE grants as-is (RLS governs rows).

-- ---------- D. Remove cross-team base-table SELECT policy ---------------
DROP POLICY IF EXISTS "Team members can view basic team profiles" ON public.profiles;

-- Recreate the safe view with SECURITY DEFINER semantics (security_invoker=off)
-- so RLS on the base table does not clip cross-member reads; the view itself
-- restricts rows to the caller's team and exposes only safe columns.
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
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE p.team_id IS NOT NULL
  AND p.team_id = public.get_user_team_id(auth.uid());

REVOKE ALL ON public.team_profiles_safe FROM PUBLIC, anon;
GRANT SELECT ON public.team_profiles_safe TO authenticated;
GRANT SELECT ON public.team_profiles_safe TO service_role;

-- ---------- Award-XP RPC (server path for client XP increments) ---------
CREATE OR REPLACE FUNCTION public.award_user_xp(_delta integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;
  IF _delta IS NULL OR _delta <= 0 OR _delta > 1000 THEN
    RAISE EXCEPTION 'invalid_delta' USING ERRCODE = '22023';
  END IF;
  UPDATE public.profiles
    SET xp_points = xp_points + _delta,
        updated_at = now()
  WHERE user_id = auth.uid()
  RETURNING xp_points INTO v_new;
  IF v_new IS NULL THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_new;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.award_user_xp(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_user_xp(integer) TO authenticated;

-- ---------- C. Teams: tighter INSERT + 10-char code generator -----------
DROP POLICY IF EXISTS "Authenticated users can create their own team" ON public.teams;
CREATE POLICY "Authenticated users can create their own team"
  ON public.teams
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.get_user_team_id(auth.uid()) IS NULL
  );

CREATE OR REPLACE FUNCTION public.generate_team_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- 10-char alphanumeric (uppercase hex) code
    new_code := upper(substring(
      md5(random()::text || clock_timestamp()::text) from 1 for 10
    ));
    SELECT EXISTS (SELECT 1 FROM public.teams WHERE team_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.generate_team_code() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_team_code() TO service_role;

-- Server-only team lookup helper — clients must use edge join-team-by-code.
REVOKE EXECUTE ON FUNCTION public.find_team_by_code(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_team_by_code(text) TO service_role;

-- ---------- E. Tenant-tagged write policies -----------------------------

-- activities: INSERT must be own user + team matches (or both null)
DROP POLICY IF EXISTS "Users can insert own activities" ON public.activities;
CREATE POLICY "Users can insert own activities"
  ON public.activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND team_id IS NOT DISTINCT FROM public.get_user_team_id(auth.uid())
  );

-- calls: INSERT & UPDATE tenant-tagged
DROP POLICY IF EXISTS "Users can insert own calls" ON public.calls;
CREATE POLICY "Users can insert own calls"
  ON public.calls
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND team_id IS NOT DISTINCT FROM public.get_user_team_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own calls" ON public.calls;
CREATE POLICY "Users can update own calls"
  ON public.calls
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND (team_id IS NULL OR team_id = public.get_user_team_id(auth.uid()))
  )
  WITH CHECK (
    auth.uid() = user_id
    AND team_id IS NOT DISTINCT FROM public.get_user_team_id(auth.uid())
  );

-- deals: INSERT & UPDATE tenant-tagged
DROP POLICY IF EXISTS "Users can insert own deals" ON public.deals;
CREATE POLICY "Users can insert own deals"
  ON public.deals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND team_id IS NOT DISTINCT FROM public.get_user_team_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own deals" ON public.deals;
CREATE POLICY "Users can update own deals"
  ON public.deals
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND (team_id IS NULL OR team_id = public.get_user_team_id(auth.uid()))
  )
  WITH CHECK (
    auth.uid() = user_id
    AND team_id IS NOT DISTINCT FROM public.get_user_team_id(auth.uid())
  );

-- sms_messages: INSERT tenant-tagged
DROP POLICY IF EXISTS "Users can create SMS messages" ON public.sms_messages;
CREATE POLICY "Users can create SMS messages"
  ON public.sms_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND team_id IS NOT DISTINCT FROM public.get_user_team_id(auth.uid())
  );

-- sos_alerts: INSERT tenant-tagged; keep management update policy
DROP POLICY IF EXISTS "Users can create own SOS alerts" ON public.sos_alerts;
CREATE POLICY "Users can create own SOS alerts"
  ON public.sos_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND team_id IS NOT DISTINCT FROM public.get_user_team_id(auth.uid())
  );

-- objections: created_by + tenant-tagged
DROP POLICY IF EXISTS "Authenticated users can insert objections" ON public.objections;
CREATE POLICY "Authenticated users can insert objections"
  ON public.objections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND team_id IS NOT DISTINCT FROM public.get_user_team_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own objections" ON public.objections;
CREATE POLICY "Users can update own objections"
  ON public.objections
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND (team_id IS NULL OR team_id = public.get_user_team_id(auth.uid()))
  )
  WITH CHECK (
    created_by = auth.uid()
    AND team_id IS NOT DISTINCT FROM public.get_user_team_id(auth.uid())
  );

-- competitions: management-only tenant-tagged update
DROP POLICY IF EXISTS "Managers can update their competitions" ON public.competitions;
CREATE POLICY "Managers can update their competitions"
  ON public.competitions
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND team_id = public.get_user_team_id(auth.uid())
    AND public.has_management_role(auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid()
    AND team_id = public.get_user_team_id(auth.uid())
    AND public.has_management_role(auth.uid())
  );

-- ---------- F. Least-privilege cleanup ----------------------------------
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public
  FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;

-- Trigger-only definer functions: revoke direct EXECUTE.
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.handle_new_user()',
    'public.handle_updated_at()',
    'public.create_default_channels()',
    'public.set_ghl_activity_team_id()',
    'public.set_aloware_log_team_id()',
    'public.set_coaching_action_fields()',
    'public.set_coaching_session_team_id()',
    'public.create_team_billing_record()',
    'public.promote_team_creator_to_manager()',
    'public.post_deal_closed_to_wins()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      -- ignore missing helpers so migration is portable
      NULL;
    END;
  END LOOP;
END $$;

-- Admin-only maintenance function.
REVOKE EXECUTE ON FUNCTION public.abandon_stale_roleplay_sessions() FROM PUBLIC, anon, authenticated;
-- Webhook-only.
REVOKE EXECUTE ON FUNCTION public.claim_stripe_webhook_event(text, text, text) FROM PUBLIC, anon, authenticated;
