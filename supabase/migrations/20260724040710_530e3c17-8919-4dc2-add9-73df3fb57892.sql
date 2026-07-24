-- Defense-in-depth: revoke anon privileges from tenant-sensitive tables.
REVOKE ALL ON public.user_gauntlet_completions FROM anon;
REVOKE ALL ON public.roleplay_sessions FROM anon;
REVOKE ALL ON public.aloware_sync_log FROM anon;
REVOKE ALL ON public.calls FROM anon;
REVOKE ALL ON public.sms_messages FROM anon;
REVOKE ALL ON public.deals FROM anon;
REVOKE ALL ON public.activities FROM anon;
REVOKE ALL ON public.notifications FROM anon;
REVOKE ALL ON public.coaching_sessions FROM anon;
REVOKE ALL ON public.coaching_actions FROM anon;

-- Remove destructive privileges that PostgREST never legitimately needs.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.calls FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.sms_messages FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.deals FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.aloware_sync_log FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.profiles FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.roleplay_sessions FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.user_gauntlet_completions FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.coaching_sessions FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.coaching_actions FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.notifications FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.activities FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.team_billing FROM anon, authenticated;

-- The UI never issues DELETE on calls; RLS should not be the last line.
REVOKE DELETE ON public.calls FROM authenticated;
REVOKE DELETE ON public.sms_messages FROM authenticated;
REVOKE DELETE ON public.aloware_sync_log FROM anon, authenticated;
