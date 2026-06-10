
UPDATE public.roleplay_sessions
SET status = 'abandoned',
    completed_at = COALESCE(completed_at, now())
WHERE status = 'in_progress'
  AND started_at < now() - interval '24 hours';

CREATE OR REPLACE FUNCTION public.abandon_stale_roleplay_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.roleplay_sessions
  SET status = 'abandoned',
      completed_at = COALESCE(completed_at, now())
  WHERE status = 'in_progress'
    AND started_at < now() - interval '24 hours';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.abandon_stale_roleplay_sessions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.abandon_stale_roleplay_sessions() TO service_role;

DO $$
BEGIN
  PERFORM cron.unschedule('abandon-stale-roleplay-sessions');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

SELECT cron.schedule(
  'abandon-stale-roleplay-sessions',
  '15 3 * * *',
  $$SELECT public.abandon_stale_roleplay_sessions();$$
);
