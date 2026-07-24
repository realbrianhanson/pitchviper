-- Aloware privacy scrub + defense-in-depth grants.
-- 1) Scrub existing aloware_sync_log rows: null out any raw payloads / error
--    strings that could contain PII, transcripts, provider bodies, or tokens.
--    We keep event_type, team_id, processed, created_at for audit continuity.
UPDATE public.aloware_sync_log
SET payload = '{}'::jsonb,
    error_message = NULL
WHERE payload IS DISTINCT FROM '{}'::jsonb
   OR error_message IS NOT NULL;

-- 2) Revoke DML on integration/log tables from the anon role. Browser anon
--    callers should never be able to write these; all writes go through
--    authenticated RLS paths or service-role edge functions.
REVOKE INSERT, UPDATE, DELETE ON public.aloware_sync_log FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.calls FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.sms_messages FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.roleplay_sessions FROM anon;

-- 3) Also revoke direct DML on aloware_sync_log from authenticated. The UI
--    only reads (SELECT via RLS) and all writes now flow through edge
--    functions with the service role.
REVOKE INSERT, UPDATE, DELETE ON public.aloware_sync_log FROM authenticated;

-- 4) Never grant TRUNCATE / REFERENCES / TRIGGER to the browser roles.
REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON public.aloware_sync_log, public.calls, public.sms_messages,
     public.profiles, public.roleplay_sessions, public.user_gauntlet_completions
  FROM anon, authenticated;

-- 5) Helpful compound index for the sync log SELECTs (team scoped, recent first).
CREATE INDEX IF NOT EXISTS aloware_sync_log_team_recent_idx
  ON public.aloware_sync_log (team_id, created_at DESC);
