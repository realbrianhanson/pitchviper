
CREATE OR REPLACE VIEW public.team_profiles_safe AS
SELECT id, user_id, team_id, full_name, avatar_url, title, current_level, xp_points,
       current_streak, longest_streak, hire_date, phone_extension, onboarding_completed,
       created_at, updated_at
FROM public.profiles;
GRANT SELECT ON public.team_profiles_safe TO authenticated;

-- Tighten sms_messages manager SELECT to user's own team only
DROP POLICY IF EXISTS "Managers can view team SMS" ON public.sms_messages;
CREATE POLICY "Managers can view own team SMS"
ON public.sms_messages FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'manager'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = sms_messages.user_id
      AND p.team_id = public.get_user_team_id(auth.uid())
  )
);

-- Tighten realtime.messages: restrict topic by team or user prefix
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='realtime' AND c.relname='messages') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users only" ON realtime.messages';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can send" ON realtime.messages';
    EXECUTE $POL$
      CREATE POLICY "Team or user scoped read"
      ON realtime.messages FOR SELECT TO authenticated
      USING (
        (realtime.topic() LIKE 'user:' || auth.uid()::text || ':%')
        OR (realtime.topic() LIKE 'team:' || COALESCE(public.get_user_team_id(auth.uid())::text, '_none_') || ':%')
      )
    $POL$;
    EXECUTE $POL$
      CREATE POLICY "Team or user scoped send"
      ON realtime.messages FOR INSERT TO authenticated
      WITH CHECK (
        (realtime.topic() LIKE 'user:' || auth.uid()::text || ':%')
        OR (realtime.topic() LIKE 'team:' || COALESCE(public.get_user_team_id(auth.uid())::text, '_none_') || ':%')
      )
    $POL$;
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Skipping realtime.messages RLS (insufficient privilege)';
END $$;
