-- Create sos_alert_status enum
CREATE TYPE public.sos_alert_status AS ENUM ('pending', 'acknowledged', 'resolved');

-- Create sos_alerts table
CREATE TABLE public.sos_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID,
  alert_type TEXT NOT NULL,
  note TEXT,
  status public.sos_alert_status NOT NULL DEFAULT 'pending',
  acknowledged_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

-- Policies for sos_alerts
CREATE POLICY "Users can create own SOS alerts"
ON public.sos_alerts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own SOS alerts"
ON public.sos_alerts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Team members can view team SOS alerts"
ON public.sos_alerts
FOR SELECT
USING (
  team_id IS NOT NULL 
  AND team_id IN (
    SELECT team_id FROM public.profiles WHERE user_id = auth.uid() AND team_id IS NOT NULL
  )
);

CREATE POLICY "Managers can update team SOS alerts"
ON public.sos_alerts
FOR UPDATE
USING (
  team_id IN (
    SELECT team_id FROM public.profiles WHERE user_id = auth.uid() AND team_id IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'manager'
  )
);

-- Enable realtime for sos_alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;

-- Create user_preferences table for sound settings
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  celebration_sounds_enabled BOOLEAN NOT NULL DEFAULT true,
  notification_sounds_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
ON public.user_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
ON public.user_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON public.user_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();