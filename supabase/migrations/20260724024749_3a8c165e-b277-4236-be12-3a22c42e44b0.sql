
-- Idempotent migration: secure coaching RPCs + revoke direct DML on coaching tables.

-- 1) create_coaching_session_with_actions
CREATE OR REPLACE FUNCTION public.create_coaching_session_with_actions(
  p_rep_id uuid,
  p_notes text,
  p_focus_areas text[] DEFAULT ARRAY[]::text[],
  p_actions jsonb DEFAULT '[]'::jsonb,
  p_due_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_team uuid;
  v_rep_team uuid;
  v_notes text;
  v_focus text[];
  v_session public.coaching_sessions;
  v_action public.coaching_actions;
  v_actions_out jsonb := '[]'::jsonb;
  v_item jsonb;
  v_title text;
  v_desc text;
  v_due date;
  v_count int := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_management_role(v_actor) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_team := public.get_user_team_id(v_actor);
  IF v_team IS NULL THEN
    RAISE EXCEPTION 'no_team' USING ERRCODE = '42501';
  END IF;

  IF p_rep_id IS NULL THEN
    RAISE EXCEPTION 'invalid_rep' USING ERRCODE = '22023';
  END IF;

  SELECT team_id INTO v_rep_team FROM public.profiles WHERE user_id = p_rep_id;
  IF v_rep_team IS NULL OR v_rep_team <> v_team THEN
    RAISE EXCEPTION 'rep_not_in_team' USING ERRCODE = '42501';
  END IF;

  v_notes := btrim(coalesce(p_notes, ''));
  IF length(v_notes) = 0 THEN
    RAISE EXCEPTION 'notes_required' USING ERRCODE = '22023';
  END IF;
  IF length(v_notes) > 4000 THEN
    v_notes := substring(v_notes from 1 for 4000);
  END IF;

  IF p_focus_areas IS NULL THEN
    v_focus := ARRAY[]::text[];
  ELSE
    SELECT array_agg(substring(btrim(x) from 1 for 80))
      INTO v_focus
      FROM (SELECT unnest(p_focus_areas) AS x) s
      WHERE btrim(x) <> ''
      LIMIT 8;
    v_focus := coalesce(v_focus, ARRAY[]::text[]);
    IF array_length(v_focus, 1) > 8 THEN
      v_focus := v_focus[1:8];
    END IF;
  END IF;

  IF p_actions IS NULL OR jsonb_typeof(p_actions) <> 'array' THEN
    RAISE EXCEPTION 'actions_required' USING ERRCODE = '22023';
  END IF;

  v_count := jsonb_array_length(p_actions);
  IF v_count = 0 THEN
    RAISE EXCEPTION 'actions_required' USING ERRCODE = '22023';
  END IF;
  IF v_count > 10 THEN
    RAISE EXCEPTION 'too_many_actions' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.coaching_sessions(manager_id, rep_id, team_id, notes, focus_areas, due_date, status)
  VALUES (v_actor, p_rep_id, v_team, v_notes, v_focus, p_due_date, 'open')
  RETURNING * INTO v_session;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_actions)
  LOOP
    v_title := btrim(coalesce(v_item->>'title',''));
    IF length(v_title) = 0 THEN CONTINUE; END IF;
    IF length(v_title) > 160 THEN v_title := substring(v_title from 1 for 160); END IF;

    v_desc := NULLIF(btrim(coalesce(v_item->>'description','')), '');
    IF v_desc IS NOT NULL AND length(v_desc) > 1000 THEN
      v_desc := substring(v_desc from 1 for 1000);
    END IF;

    v_due := NULL;
    IF (v_item ? 'due_date') AND (v_item->>'due_date') IS NOT NULL AND btrim(v_item->>'due_date') <> '' THEN
      BEGIN
        v_due := (v_item->>'due_date')::date;
      EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'invalid_due_date' USING ERRCODE = '22023';
      END;
    END IF;

    INSERT INTO public.coaching_actions(session_id, team_id, rep_id, assigned_by, title, description, due_date, status)
    VALUES (v_session.id, v_team, p_rep_id, v_actor, v_title, v_desc, v_due, 'assigned')
    RETURNING * INTO v_action;

    v_actions_out := v_actions_out || jsonb_build_object(
      'id', v_action.id,
      'session_id', v_action.session_id,
      'rep_id', v_action.rep_id,
      'title', v_action.title,
      'description', v_action.description,
      'due_date', v_action.due_date,
      'status', v_action.status,
      'created_at', v_action.created_at
    );
  END LOOP;

  UPDATE public.profiles SET last_coached_at = now() WHERE user_id = p_rep_id;

  INSERT INTO public.audit_events(team_id, actor_id, action, target_type, target_id, metadata)
  VALUES (
    v_team, v_actor, 'coaching_session.created', 'coaching_session', v_session.id::text,
    jsonb_build_object('rep_id', p_rep_id, 'action_count', jsonb_array_length(v_actions_out))
  );

  RETURN jsonb_build_object(
    'session', jsonb_build_object(
      'id', v_session.id,
      'manager_id', v_session.manager_id,
      'rep_id', v_session.rep_id,
      'team_id', v_session.team_id,
      'notes', v_session.notes,
      'focus_areas', v_session.focus_areas,
      'due_date', v_session.due_date,
      'status', v_session.status,
      'created_at', v_session.created_at,
      'updated_at', v_session.updated_at
    ),
    'actions', v_actions_out
  );
END;
$$;

-- 2) update_coaching_action_status
CREATE OR REPLACE FUNCTION public.update_coaching_action_status(
  p_action_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_team uuid;
  v_action public.coaching_actions;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_status NOT IN ('assigned','in_progress','completed') THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_action FROM public.coaching_actions WHERE id = p_action_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'action_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_actor_team := public.get_user_team_id(v_actor);

  IF NOT (
    v_action.rep_id = v_actor
    OR (public.has_management_role(v_actor) AND v_action.team_id = v_actor_team)
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.coaching_actions
     SET status = p_status,
         completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE NULL END,
         updated_at = now()
   WHERE id = p_action_id
   RETURNING * INTO v_action;

  INSERT INTO public.audit_events(team_id, actor_id, action, target_type, target_id, metadata)
  VALUES (
    v_action.team_id, v_actor, 'coaching_action.status_changed', 'coaching_action', v_action.id::text,
    jsonb_build_object('status', p_status, 'rep_id', v_action.rep_id, 'session_id', v_action.session_id)
  );

  RETURN jsonb_build_object(
    'id', v_action.id,
    'session_id', v_action.session_id,
    'team_id', v_action.team_id,
    'rep_id', v_action.rep_id,
    'title', v_action.title,
    'description', v_action.description,
    'due_date', v_action.due_date,
    'status', v_action.status,
    'completed_at', v_action.completed_at,
    'updated_at', v_action.updated_at,
    'created_at', v_action.created_at
  );
END;
$$;

-- 3) Lock down direct DML on coaching tables; keep SELECT via RLS.
REVOKE INSERT, UPDATE, DELETE ON public.coaching_sessions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.coaching_actions FROM anon, authenticated;
GRANT SELECT ON public.coaching_sessions TO authenticated;
GRANT SELECT ON public.coaching_actions TO authenticated;
GRANT ALL ON public.coaching_sessions TO service_role;
GRANT ALL ON public.coaching_actions TO service_role;

-- 4) Restrict RPC execution: authenticated only, no PUBLIC/anon.
REVOKE ALL ON FUNCTION public.create_coaching_session_with_actions(uuid, text, text[], jsonb, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_coaching_action_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_coaching_session_with_actions(uuid, text, text[], jsonb, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_coaching_action_status(uuid, text) TO authenticated;
GRANT ALL ON FUNCTION public.create_coaching_session_with_actions(uuid, text, text[], jsonb, date) TO service_role;
GRANT ALL ON FUNCTION public.update_coaching_action_status(uuid, text) TO service_role;
