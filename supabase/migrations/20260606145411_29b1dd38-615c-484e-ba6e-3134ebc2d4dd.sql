
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ghl_user_id text;
CREATE INDEX IF NOT EXISTS profiles_ghl_user_id_idx ON public.profiles(ghl_user_id);

CREATE OR REPLACE FUNCTION public.match_ghl_user(_email text, _ghl_user_id text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF _email IS NOT NULL AND length(trim(_email)) > 0 THEN
    SELECT u.id INTO v_user_id
    FROM auth.users u
    WHERE lower(u.email) = lower(trim(_email))
    LIMIT 1;
    IF v_user_id IS NOT NULL THEN RETURN v_user_id; END IF;
  END IF;

  IF _ghl_user_id IS NOT NULL AND length(trim(_ghl_user_id)) > 0 THEN
    SELECT p.user_id INTO v_user_id
    FROM public.profiles p
    WHERE p.ghl_user_id = trim(_ghl_user_id)
    LIMIT 1;
    IF v_user_id IS NOT NULL THEN RETURN v_user_id; END IF;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TABLE IF NOT EXISTS public.ghl_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  ghl_user_id text,
  assigned_email text,
  matched_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  match_method text CHECK (match_method IN ('email','ghl_user_id','unmatched')),
  unassigned boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ghl_activities_matched_user_idx ON public.ghl_activities(matched_user_id);
CREATE INDEX IF NOT EXISTS ghl_activities_unassigned_idx ON public.ghl_activities(unassigned) WHERE unassigned = true;
CREATE INDEX IF NOT EXISTS ghl_activities_occurred_at_idx ON public.ghl_activities(occurred_at DESC);

GRANT SELECT ON public.ghl_activities TO authenticated;
GRANT ALL ON public.ghl_activities TO service_role;

ALTER TABLE public.ghl_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reps view own GHL activity"
  ON public.ghl_activities FOR SELECT TO authenticated
  USING (matched_user_id = auth.uid());

CREATE POLICY "Managers view all GHL activity"
  ON public.ghl_activities FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));
