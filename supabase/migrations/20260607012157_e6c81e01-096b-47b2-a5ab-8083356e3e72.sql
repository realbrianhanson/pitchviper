CREATE OR REPLACE FUNCTION public.append_roleplay_messages(
  p_session_id uuid,
  p_messages jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF p_messages IS NULL OR jsonb_typeof(p_messages) <> 'array' THEN
    RAISE EXCEPTION 'p_messages must be a JSON array';
  END IF;

  UPDATE public.roleplay_sessions
  SET transcript = COALESCE(transcript, '[]'::jsonb) || p_messages
  WHERE id = p_session_id
  RETURNING transcript INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.append_roleplay_messages(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.append_roleplay_messages(uuid, jsonb) TO service_role;