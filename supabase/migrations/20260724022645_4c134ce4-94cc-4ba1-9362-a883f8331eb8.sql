
-- Security reconciliation for tenant-hardening batch.
-- Idempotent: mirrors additional live Cloud hardening on top of prior migration.

-- 1. Safe has_management_role: compare enum via ::text so this runs cleanly on
-- a fresh database in the same transaction that added the 'owner'/'admin' enum
-- labels (Postgres forbids unsafe use of newly added enum labels in the same tx).
CREATE OR REPLACE FUNCTION public.has_management_role(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('owner','admin','manager')
  )
$$;

-- 2. Team-scoped management RLS policies (idempotent replacements).

-- calls: management SELECT scoped to caller team
DROP POLICY IF EXISTS "Managers can view all calls" ON public.calls;
DROP POLICY IF EXISTS "Managers can view team calls" ON public.calls;
DROP POLICY IF EXISTS "Management can view team calls" ON public.calls;
CREATE POLICY "Management can view team calls" ON public.calls
  FOR SELECT TO authenticated
  USING (team_id = public.get_user_team_id(auth.uid()) AND public.has_management_role(auth.uid()));

-- deals: management SELECT scoped to caller team
DROP POLICY IF EXISTS "Managers can view all deals" ON public.deals;
DROP POLICY IF EXISTS "Managers can view team deals" ON public.deals;
DROP POLICY IF EXISTS "Management can view team deals" ON public.deals;
CREATE POLICY "Management can view team deals" ON public.deals
  FOR SELECT TO authenticated
  USING (team_id = public.get_user_team_id(auth.uid()) AND public.has_management_role(auth.uid()));

-- competitions INSERT: created_by = auth.uid, team_id = caller team, management
DROP POLICY IF EXISTS "Managers can create competitions" ON public.competitions;
DROP POLICY IF EXISTS "Managers can create team competitions" ON public.competitions;
DROP POLICY IF EXISTS "Management can create team competitions" ON public.competitions;
CREATE POLICY "Management can create team competitions" ON public.competitions
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND team_id = public.get_user_team_id(auth.uid())
    AND public.has_management_role(auth.uid())
  );

-- data_access_log SELECT: management, target user belongs to caller team
DROP POLICY IF EXISTS "Managers can view audit logs" ON public.data_access_log;
DROP POLICY IF EXISTS "Managers can view team audit logs" ON public.data_access_log;
DROP POLICY IF EXISTS "Management can view team audit logs" ON public.data_access_log;
CREATE POLICY "Management can view team audit logs" ON public.data_access_log
  FOR SELECT TO authenticated
  USING (
    public.has_management_role(auth.uid())
    AND user_id IN (
      SELECT p.user_id FROM public.profiles p
      WHERE p.team_id = public.get_user_team_id(auth.uid())
    )
  );

-- sms_messages SELECT: management, row team_id = caller team
DROP POLICY IF EXISTS "Managers can view all SMS messages" ON public.sms_messages;
DROP POLICY IF EXISTS "Managers can view team SMS messages" ON public.sms_messages;
DROP POLICY IF EXISTS "Management can view team SMS messages" ON public.sms_messages;
CREATE POLICY "Management can view team SMS messages" ON public.sms_messages
  FOR SELECT TO authenticated
  USING (team_id = public.get_user_team_id(auth.uid()) AND public.has_management_role(auth.uid()));

-- sos_alerts UPDATE: management, row and WITH CHECK team_id = caller team
DROP POLICY IF EXISTS "Managers can update SOS alerts" ON public.sos_alerts;
DROP POLICY IF EXISTS "Managers can update team SOS alerts" ON public.sos_alerts;
DROP POLICY IF EXISTS "Management can update team SOS alerts" ON public.sos_alerts;
CREATE POLICY "Management can update team SOS alerts" ON public.sos_alerts
  FOR UPDATE TO authenticated
  USING (team_id = public.get_user_team_id(auth.uid()) AND public.has_management_role(auth.uid()))
  WITH CHECK (team_id = public.get_user_team_id(auth.uid()) AND public.has_management_role(auth.uid()));

-- team_broadcasts INSERT: sender_id = auth.uid, team_id = caller team, management
DROP POLICY IF EXISTS "Managers can create broadcasts" ON public.team_broadcasts;
DROP POLICY IF EXISTS "Managers can create team broadcasts" ON public.team_broadcasts;
DROP POLICY IF EXISTS "Management can create team broadcasts" ON public.team_broadcasts;
CREATE POLICY "Management can create team broadcasts" ON public.team_broadcasts
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND team_id = public.get_user_team_id(auth.uid())
    AND public.has_management_role(auth.uid())
  );

-- toolkit_items INSERT/UPDATE: management + team_id = caller team
DROP POLICY IF EXISTS "Managers can insert toolkit items" ON public.toolkit_items;
DROP POLICY IF EXISTS "Managers can insert team toolkit items" ON public.toolkit_items;
DROP POLICY IF EXISTS "Management can insert team toolkit items" ON public.toolkit_items;
CREATE POLICY "Management can insert team toolkit items" ON public.toolkit_items
  FOR INSERT TO authenticated
  WITH CHECK (team_id = public.get_user_team_id(auth.uid()) AND public.has_management_role(auth.uid()));

DROP POLICY IF EXISTS "Managers can update toolkit items" ON public.toolkit_items;
DROP POLICY IF EXISTS "Managers can update team toolkit items" ON public.toolkit_items;
DROP POLICY IF EXISTS "Management can update team toolkit items" ON public.toolkit_items;
CREATE POLICY "Management can update team toolkit items" ON public.toolkit_items
  FOR UPDATE TO authenticated
  USING (team_id = public.get_user_team_id(auth.uid()) AND public.has_management_role(auth.uid()))
  WITH CHECK (team_id = public.get_user_team_id(auth.uid()) AND public.has_management_role(auth.uid()));

-- Remove obsolete manager-only company_settings policies now superseded by management policies.
DROP POLICY IF EXISTS "Managers can view company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Managers can insert company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Managers can update company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Managers can delete company settings" ON public.company_settings;

-- 3. SECURITY DEFINER function grants: revoke broad access, grant only what's needed.

-- Server-only helpers: revoke everything, service_role only.
REVOKE ALL ON FUNCTION public.append_roleplay_messages(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.append_roleplay_messages(uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.abandon_stale_roleplay_sessions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.abandon_stale_roleplay_sessions() TO service_role;

REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(uuid, text, integer, integer) TO service_role;

REVOKE ALL ON FUNCTION public.match_ghl_user(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_ghl_user(text, text) TO service_role;

-- Signed-in helpers: revoke anon, keep authenticated + service_role.
REVOKE ALL ON FUNCTION public.find_team_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_team_by_code(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_management_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_management_role(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.log_team_audit_event(text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_team_audit_event(text, text, text, jsonb) TO authenticated, service_role;
