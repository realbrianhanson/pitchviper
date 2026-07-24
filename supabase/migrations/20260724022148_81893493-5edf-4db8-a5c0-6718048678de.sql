-- Tenant isolation and management-role hardening.
-- Idempotent mirror of the current live DB state.

-- 1. app_role enum: add owner + admin
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                 WHERE t.typname = 'app_role' AND e.enumlabel = 'owner') THEN
    ALTER TYPE public.app_role ADD VALUE 'owner';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                 WHERE t.typname = 'app_role' AND e.enumlabel = 'admin') THEN
    ALTER TYPE public.app_role ADD VALUE 'admin';
  END IF;
END $$;

-- 2. has_management_role helper
CREATE OR REPLACE FUNCTION public.has_management_role(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('owner'::public.app_role,'admin'::public.app_role,'manager'::public.app_role)
  )
$$;

-- 3. ghl_activities: nullable team_id + derive trigger + team-scoped RLS
ALTER TABLE public.ghl_activities ADD COLUMN IF NOT EXISTS team_id uuid
  REFERENCES public.teams(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_ghl_activities_team_occurred
  ON public.ghl_activities(team_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.set_ghl_activity_team_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if new.team_id is null and new.matched_user_id is not null then
    select team_id into new.team_id from public.profiles where user_id = new.matched_user_id limit 1;
  end if;
  return new;
end $$;

DROP TRIGGER IF EXISTS trg_set_ghl_activity_team_id ON public.ghl_activities;
CREATE TRIGGER trg_set_ghl_activity_team_id
  BEFORE INSERT OR UPDATE OF matched_user_id, team_id ON public.ghl_activities
  FOR EACH ROW EXECUTE FUNCTION public.set_ghl_activity_team_id();

DROP POLICY IF EXISTS "Managers can view all GHL activity" ON public.ghl_activities;
DROP POLICY IF EXISTS "Management can view team GHL activity" ON public.ghl_activities;
CREATE POLICY "Management can view team GHL activity" ON public.ghl_activities
  FOR SELECT TO authenticated
  USING (team_id = public.get_user_team_id(auth.uid()) AND public.has_management_role(auth.uid()));

-- 4. aloware_sync_log: nullable team_id + derive trigger + team-scoped RLS
ALTER TABLE public.aloware_sync_log ADD COLUMN IF NOT EXISTS team_id uuid
  REFERENCES public.teams(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_aloware_sync_log_team_created
  ON public.aloware_sync_log(team_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_aloware_log_team_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare v_user text; v_call text;
begin
  if new.team_id is not null then return new; end if;
  v_user := coalesce(new.payload->>'user_id', new.payload->>'agent_id', new.payload->>'alowareUserId');
  if v_user is not null then
    select team_id into new.team_id from public.profiles where aloware_user_id = v_user limit 1;
  end if;
  if new.team_id is null then
    v_call := coalesce(new.payload->>'call_id', new.payload->>'callId', new.payload->>'id');
    if v_call is not null then
      select team_id into new.team_id from public.calls where aloware_call_id = v_call limit 1;
    end if;
  end if;
  return new;
end $$;

DROP TRIGGER IF EXISTS trg_set_aloware_log_team_id ON public.aloware_sync_log;
CREATE TRIGGER trg_set_aloware_log_team_id
  BEFORE INSERT OR UPDATE OF payload, team_id ON public.aloware_sync_log
  FOR EACH ROW EXECUTE FUNCTION public.set_aloware_log_team_id();

DROP POLICY IF EXISTS "Managers can view sync logs" ON public.aloware_sync_log;
DROP POLICY IF EXISTS "Management can view team sync logs" ON public.aloware_sync_log;
CREATE POLICY "Management can view team sync logs" ON public.aloware_sync_log
  FOR SELECT TO authenticated
  USING (team_id = public.get_user_team_id(auth.uid()) AND public.has_management_role(auth.uid()));

-- 5. Team-scoped management SELECT for daily_stats and roleplay_sessions
DROP POLICY IF EXISTS "Managers can view team daily stats" ON public.daily_stats;
DROP POLICY IF EXISTS "Management can view team daily stats" ON public.daily_stats;
CREATE POLICY "Management can view team daily stats" ON public.daily_stats
  FOR SELECT TO authenticated
  USING (
    public.has_management_role(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = daily_stats.user_id
        AND p.team_id = public.get_user_team_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can view team roleplay sessions" ON public.roleplay_sessions;
DROP POLICY IF EXISTS "Management can view team roleplay sessions" ON public.roleplay_sessions;
CREATE POLICY "Management can view team roleplay sessions" ON public.roleplay_sessions
  FOR SELECT TO authenticated
  USING (
    public.has_management_role(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = roleplay_sessions.user_id
        AND p.team_id = public.get_user_team_id(auth.uid())
    )
  );

-- 6. company_settings extended columns + one-row-per-team
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS brand_color text NOT NULL DEFAULT '#14532d',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS daily_calls_target integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS daily_appointments_target integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS monthly_revenue_target numeric NOT NULL DEFAULT 100000,
  ADD COLUMN IF NOT EXISTS crm_provider text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS crm_connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS setup_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='company_settings_daily_calls_target_check') THEN
    ALTER TABLE public.company_settings ADD CONSTRAINT company_settings_daily_calls_target_check
      CHECK (daily_calls_target >= 0 AND daily_calls_target <= 10000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='company_settings_daily_appointments_target_check') THEN
    ALTER TABLE public.company_settings ADD CONSTRAINT company_settings_daily_appointments_target_check
      CHECK (daily_appointments_target >= 0 AND daily_appointments_target <= 1000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='company_settings_monthly_revenue_target_check') THEN
    ALTER TABLE public.company_settings ADD CONSTRAINT company_settings_monthly_revenue_target_check
      CHECK (monthly_revenue_target >= 0);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS company_settings_one_per_team
  ON public.company_settings(team_id) WHERE team_id IS NOT NULL;

-- 7. team_billing table
CREATE TABLE IF NOT EXISTS public.team_billing (
  team_id uuid PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'trial'
    CHECK (plan IN ('trial','starter','growth','scale','enterprise')),
  status text NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing','active','past_due','canceled','paused')),
  trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  seat_limit integer NOT NULL DEFAULT 10 CHECK (seat_limit > 0),
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.team_billing TO authenticated;
GRANT ALL ON public.team_billing TO service_role;
ALTER TABLE public.team_billing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Management can view team billing" ON public.team_billing;
CREATE POLICY "Management can view team billing" ON public.team_billing
  FOR SELECT TO authenticated
  USING (team_id = public.get_user_team_id(auth.uid()) AND public.has_management_role(auth.uid()));

CREATE OR REPLACE FUNCTION public.create_team_billing_record()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  insert into public.team_billing(team_id) values(new.id) on conflict(team_id) do nothing;
  return new;
end $$;

DROP TRIGGER IF EXISTS trg_create_team_billing_record ON public.teams;
CREATE TRIGGER trg_create_team_billing_record
  AFTER INSERT ON public.teams FOR EACH ROW EXECUTE FUNCTION public.create_team_billing_record();

-- 8. coaching_sessions: team_id + status + due/completed + trigger + RLS
ALTER TABLE public.coaching_sessions
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='coaching_sessions_status_check') THEN
    ALTER TABLE public.coaching_sessions ADD CONSTRAINT coaching_sessions_status_check
      CHECK (status IN ('open','in_progress','completed','canceled'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_coaching_session_team_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if new.team_id is null then
    select team_id into new.team_id from public.profiles where user_id = new.rep_id limit 1;
  end if;
  new.updated_at := now();
  if new.status = 'completed' and new.completed_at is null then new.completed_at := now();
  elsif new.status <> 'completed' then new.completed_at := null; end if;
  return new;
end $$;

DROP TRIGGER IF EXISTS trg_set_coaching_session_team_id ON public.coaching_sessions;
CREATE TRIGGER trg_set_coaching_session_team_id
  BEFORE INSERT OR UPDATE ON public.coaching_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_coaching_session_team_id();

DROP POLICY IF EXISTS "Management can view team coaching sessions" ON public.coaching_sessions;
CREATE POLICY "Management can view team coaching sessions" ON public.coaching_sessions
  FOR SELECT TO authenticated
  USING (team_id = public.get_user_team_id(auth.uid()) AND public.has_management_role(auth.uid()));

DROP POLICY IF EXISTS "Management can insert team coaching sessions" ON public.coaching_sessions;
CREATE POLICY "Management can insert team coaching sessions" ON public.coaching_sessions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_management_role(auth.uid()) AND manager_id = auth.uid());

DROP POLICY IF EXISTS "Management can update team coaching sessions" ON public.coaching_sessions;
CREATE POLICY "Management can update team coaching sessions" ON public.coaching_sessions
  FOR UPDATE TO authenticated
  USING (team_id = public.get_user_team_id(auth.uid()) AND public.has_management_role(auth.uid()));

DROP POLICY IF EXISTS "Reps can view their own coaching sessions" ON public.coaching_sessions;
CREATE POLICY "Reps can view their own coaching sessions" ON public.coaching_sessions
  FOR SELECT TO authenticated USING (rep_id = auth.uid());

-- 9. coaching_actions table
CREATE TABLE IF NOT EXISTS public.coaching_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.coaching_sessions(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  rep_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 240),
  description text,
  due_date date,
  status text NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned','in_progress','completed','dismissed')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaching_actions TO authenticated;
GRANT ALL ON public.coaching_actions TO service_role;
ALTER TABLE public.coaching_actions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_coaching_actions_team_status
  ON public.coaching_actions(team_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_coaching_actions_rep_status
  ON public.coaching_actions(rep_id, status, due_date);

CREATE OR REPLACE FUNCTION public.set_coaching_action_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare v_team uuid; v_rep uuid;
begin
  select team_id, rep_id into v_team, v_rep from public.coaching_sessions where id = new.session_id;
  if v_team is null or v_rep is null then raise exception 'Invalid coaching session'; end if;
  new.team_id := v_team; new.rep_id := v_rep; new.updated_at := now();
  if tg_op = 'INSERT' then new.assigned_by := auth.uid(); end if;
  if tg_op = 'UPDATE' and not public.has_management_role(auth.uid()) then
    if new.session_id is distinct from old.session_id or new.team_id is distinct from old.team_id
       or new.rep_id is distinct from old.rep_id or new.assigned_by is distinct from old.assigned_by
       or new.title is distinct from old.title or new.description is distinct from old.description
       or new.due_date is distinct from old.due_date or new.created_at is distinct from old.created_at then
      raise exception 'Reps may only update action status';
    end if;
  end if;
  if new.status = 'completed' and new.completed_at is null then new.completed_at := now();
  elsif new.status <> 'completed' then new.completed_at := null; end if;
  return new;
end $$;

DROP TRIGGER IF EXISTS trg_set_coaching_action_fields ON public.coaching_actions;
CREATE TRIGGER trg_set_coaching_action_fields
  BEFORE INSERT OR UPDATE ON public.coaching_actions
  FOR EACH ROW EXECUTE FUNCTION public.set_coaching_action_fields();

DROP POLICY IF EXISTS "Management can view team coaching actions" ON public.coaching_actions;
CREATE POLICY "Management can view team coaching actions" ON public.coaching_actions
  FOR SELECT TO authenticated
  USING (team_id = public.get_user_team_id(auth.uid()) AND public.has_management_role(auth.uid()));

DROP POLICY IF EXISTS "Management can insert team coaching actions" ON public.coaching_actions;
CREATE POLICY "Management can insert team coaching actions" ON public.coaching_actions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_management_role(auth.uid()));

DROP POLICY IF EXISTS "Management can update team coaching actions" ON public.coaching_actions;
CREATE POLICY "Management can update team coaching actions" ON public.coaching_actions
  FOR UPDATE TO authenticated
  USING (team_id = public.get_user_team_id(auth.uid()) AND public.has_management_role(auth.uid()));

DROP POLICY IF EXISTS "Management can delete team coaching actions" ON public.coaching_actions;
CREATE POLICY "Management can delete team coaching actions" ON public.coaching_actions
  FOR DELETE TO authenticated
  USING (team_id = public.get_user_team_id(auth.uid()) AND public.has_management_role(auth.uid()));

DROP POLICY IF EXISTS "Reps can view own coaching actions" ON public.coaching_actions;
CREATE POLICY "Reps can view own coaching actions" ON public.coaching_actions
  FOR SELECT TO authenticated USING (rep_id = auth.uid());

DROP POLICY IF EXISTS "Reps can update own coaching action status" ON public.coaching_actions;
CREATE POLICY "Reps can update own coaching action status" ON public.coaching_actions
  FOR UPDATE TO authenticated USING (rep_id = auth.uid())
  WITH CHECK (rep_id = auth.uid());

-- 10. audit_events + log_team_audit_event RPC
CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_events_team_created
  ON public.audit_events(team_id, created_at DESC);

DROP POLICY IF EXISTS "Management can view team audit events" ON public.audit_events;
CREATE POLICY "Management can view team audit events" ON public.audit_events
  FOR SELECT TO authenticated
  USING (team_id = public.get_user_team_id(auth.uid()) AND public.has_management_role(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_team_audit_event(
  p_action text, p_target_type text,
  p_target_id text DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare v_team uuid; v_id uuid;
begin
  v_team := public.get_user_team_id(auth.uid());
  if auth.uid() is null or v_team is null then raise exception 'Not authorized'; end if;
  insert into public.audit_events(team_id, actor_id, action, target_type, target_id, metadata)
  values (v_team, auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_metadata,'{}'::jsonb))
  returning id into v_id;
  return v_id;
end $$;