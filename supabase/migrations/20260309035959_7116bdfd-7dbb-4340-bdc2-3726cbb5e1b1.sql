
-- =============================================
-- SECURITY HARDENING: Fix RLS vulnerabilities
-- =============================================

-- 1. FIX: user_roles - prevent self-escalation to manager
-- Drop the permissive INSERT policy and replace with one that only allows 'rep'
DROP POLICY IF EXISTS "Users can insert their own role on signup" ON public.user_roles;
CREATE POLICY "Users can only self-assign rep role on signup"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND role = 'rep'::app_role);

-- 2. FIX: user_badges - restrict to service_role only
-- No regular user should be awarding badges; only backend functions should
DROP POLICY IF EXISTS "System can insert badges for users" ON public.user_badges;
CREATE POLICY "Service role can insert badges"
  ON public.user_badges
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- 3. FIX: competition_participants - restrict UPDATE to service_role only
DROP POLICY IF EXISTS "System can update participant standings" ON public.competition_participants;
CREATE POLICY "Service role can update participant standings"
  ON public.competition_participants
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- 4. FIX: toolkit_items - restrict INSERT/UPDATE to actual managers only
DROP POLICY IF EXISTS "Managers can insert toolkit items" ON public.toolkit_items;
DROP POLICY IF EXISTS "Managers can update toolkit items" ON public.toolkit_items;
CREATE POLICY "Managers can insert toolkit items"
  ON public.toolkit_items
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Managers can update toolkit items"
  ON public.toolkit_items
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'manager'::app_role));

-- 5. FIX: notifications - restrict INSERT to service_role only
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
-- Also drop any variant that might exist
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- 6. FIX: audio_training_scores - restrict SELECT to own records only (authenticated)
DROP POLICY IF EXISTS "Users can view all audio training scores" ON public.audio_training_scores;
CREATE POLICY "Users can view own audio training scores"
  ON public.audio_training_scores
  FOR SELECT
  USING (auth.uid() = user_id);

-- Also add INSERT/UPDATE/DELETE for own records if not already present
DROP POLICY IF EXISTS "Users can insert own audio training scores" ON public.audio_training_scores;
CREATE POLICY "Users can insert own audio training scores"
  ON public.audio_training_scores
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 7. FIX: deal_stage_history - restrict INSERT to deals owned by the user
DROP POLICY IF EXISTS "Users can insert deal history" ON public.deal_stage_history;
CREATE POLICY "Users can insert deal history for own deals"
  ON public.deal_stage_history
  FOR INSERT
  WITH CHECK (
    deal_id IN (SELECT id FROM public.deals WHERE user_id = auth.uid())
  );

-- 8. FIX: competition_activity - restrict INSERT to service_role only
DROP POLICY IF EXISTS "System can insert activity" ON public.competition_activity;
CREATE POLICY "Service role can insert competition activity"
  ON public.competition_activity
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
