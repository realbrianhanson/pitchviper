
DO $$
DECLARE
  v_uid uuid := '653724a8-f25e-45b7-b7a2-5d8fa69c3dbf';
  v_team_id uuid;
  v_code text;
BEGIN
  SELECT id INTO v_team_id FROM public.teams WHERE created_by = v_uid ORDER BY created_at ASC LIMIT 1;
  IF v_team_id IS NULL THEN
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    INSERT INTO public.teams (name, team_code, created_by)
    VALUES ('Mike''s Workspace', v_code, v_uid)
    RETURNING id INTO v_team_id;
  END IF;

  UPDATE public.profiles
     SET team_id = v_team_id, onboarding_completed = true
   WHERE user_id = v_uid;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'manager')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.team_billing (team_id, plan, status, trial_ends_at, seat_limit, billing_interval, subscription_quantity)
  VALUES (v_team_id, 'growth', 'trialing', now() + interval '365 days', 25, 'monthly', 25)
  ON CONFLICT (team_id) DO UPDATE
    SET plan = 'growth',
        status = 'trialing',
        trial_ends_at = GREATEST(coalesce(public.team_billing.trial_ends_at, now()), now() + interval '365 days'),
        seat_limit = 25,
        updated_at = now();
END $$;
