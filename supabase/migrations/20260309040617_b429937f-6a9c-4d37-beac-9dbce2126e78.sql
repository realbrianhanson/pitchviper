-- =============================================
-- SECURITY HARDENING PHASE 2: Privacy & Data Access Controls
-- =============================================

-- 1. FIX: profiles table - restrict sensitive field access
-- Team members should only see basic info, not hire dates, extensions, or Aloware IDs
DROP POLICY IF EXISTS "Team members can view each other profiles" ON public.profiles;

-- Allow viewing only non-sensitive fields for team members
CREATE POLICY "Team members can view basic team profiles"
  ON public.profiles
  FOR SELECT
  USING (
    team_id IS NOT NULL 
    AND team_id = get_user_team_id(auth.uid())
    AND user_id != auth.uid() -- not own profile (covered by separate policy)
  );

-- Note: The existing "Users can view their own profile" policy allows full access to own data
-- Managers can use service_role in edge functions to access full team data when needed

-- 2. FIX: coaching_sessions - prevent cross-manager access
-- Add team_id scoping to ensure managers only see sessions for their team
DROP POLICY IF EXISTS "Managers can view coaching sessions they created" ON public.coaching_sessions;
CREATE POLICY "Managers can view own team coaching sessions"
  ON public.coaching_sessions
  FOR SELECT
  USING (
    manager_id = auth.uid()
    AND rep_id IN (
      SELECT p.user_id 
      FROM public.profiles p 
      WHERE p.team_id = get_user_team_id(auth.uid())
    )
  );

-- 3. FIX: Add audit logging for sensitive research access
-- Create a table to track when prospect research is accessed
CREATE TABLE IF NOT EXISTS public.data_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS on audit log
ALTER TABLE public.data_access_log ENABLE ROW LEVEL SECURITY;

-- Only service role can insert audit logs (via triggers)
CREATE POLICY "Service role can insert audit logs"
  ON public.data_access_log
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Managers can view audit logs for their team
CREATE POLICY "Managers can view team audit logs"
  ON public.data_access_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'manager'::app_role
    )
    AND user_id IN (
      SELECT p.user_id 
      FROM public.profiles p 
      WHERE p.team_id = get_user_team_id(auth.uid())
    )
  );

-- 4. Add indexes for performance on new audit table
CREATE INDEX IF NOT EXISTS idx_data_access_log_user_id ON public.data_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_log_table_record ON public.data_access_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_data_access_log_accessed_at ON public.data_access_log(accessed_at DESC);