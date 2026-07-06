
-- 1. user_roles: prevent self-promotion to manager
DROP POLICY IF EXISTS "Users can update their own role" ON public.user_roles;
CREATE POLICY "Users can only downgrade themselves to rep"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND role = 'rep'::public.app_role);

-- 2. teams: any authenticated user can create a team they own; SELECT scoped to membership/ownership
DROP POLICY IF EXISTS "Managers can create teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can view teams" ON public.teams;

CREATE POLICY "Authenticated users can create their own team"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can view their own team or teams they created"
ON public.teams
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR id = public.get_user_team_id(auth.uid())
);

-- Allow anon/authenticated to look up a team by code during join flow?
-- Onboarding StepTeam calls .eq('team_code', code) — needs SELECT access on that row.
-- We must permit lookup by code without leaking the full table. Use a SECURITY DEFINER RPC:
CREATE OR REPLACE FUNCTION public.find_team_by_code(_code text)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.name
  FROM public.teams t
  WHERE t.team_code = upper(_code)
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.find_team_by_code(text) TO authenticated;

-- 3. Trigger to promote team creator to manager on team creation
CREATE OR REPLACE FUNCTION public.promote_team_creator_to_manager()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Upsert manager role for the creator
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.created_by, 'manager'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Remove any 'rep' role for the creator (single-role convention: get_user_role uses LIMIT 1)
  DELETE FROM public.user_roles
  WHERE user_id = NEW.created_by AND role = 'rep'::public.app_role;

  -- Attach the creator's profile to this team if not already set
  UPDATE public.profiles
  SET team_id = NEW.id
  WHERE user_id = NEW.created_by
    AND (team_id IS NULL OR team_id <> NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_team_creator ON public.teams;
CREATE TRIGGER trg_promote_team_creator
AFTER INSERT ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.promote_team_creator_to_manager();

-- Also fire the existing default channels trigger if it's not attached
DROP TRIGGER IF EXISTS trg_create_default_channels ON public.teams;
CREATE TRIGGER trg_create_default_channels
AFTER INSERT ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.create_default_channels();

-- 4. Require authentication on previously world-readable tables
DROP POLICY IF EXISTS "Anyone can view audio examples" ON public.manager_audio_examples;
CREATE POLICY "Authenticated users can view audio examples"
ON public.manager_audio_examples
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Managers can add audio examples" ON public.manager_audio_examples;
CREATE POLICY "Managers can add audio examples"
ON public.manager_audio_examples
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));

DROP POLICY IF EXISTS "Managers can delete their audio examples" ON public.manager_audio_examples;
CREATE POLICY "Managers can delete their audio examples"
ON public.manager_audio_examples
FOR DELETE
TO authenticated
USING (auth.uid() = recorded_by);

DROP POLICY IF EXISTS "Anyone can view gauntlet challenges" ON public.gauntlet_challenges;
CREATE POLICY "Authenticated users can view gauntlet challenges"
ON public.gauntlet_challenges
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view levels" ON public.levels;
CREATE POLICY "Authenticated users can view levels"
ON public.levels
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view certifications" ON public.certifications;
CREATE POLICY "Authenticated users can view certifications"
ON public.certifications
FOR SELECT TO authenticated USING (true);

-- Revoke lingering anon read grants on these tables
REVOKE SELECT ON public.manager_audio_examples FROM anon;
REVOKE SELECT ON public.gauntlet_challenges FROM anon;
REVOKE SELECT ON public.levels FROM anon;
REVOKE SELECT ON public.certifications FROM anon;

-- 5. Remove duplicate INSERT policy on audio_training_scores
DROP POLICY IF EXISTS "Users can insert their own scores" ON public.audio_training_scores;

-- Also scope existing user_roles policies to authenticated (currently {public})
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only self-assign rep role on signup" ON public.user_roles;
CREATE POLICY "Users can only self-assign rep role on signup"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'rep'::public.app_role);
