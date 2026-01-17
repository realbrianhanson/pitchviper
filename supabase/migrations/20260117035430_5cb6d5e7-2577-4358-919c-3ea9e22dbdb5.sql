-- Add voice commands preference to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS voice_commands_enabled BOOLEAN NOT NULL DEFAULT false;

-- Create team_broadcasts table for manager broadcasts
CREATE TABLE public.team_broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  broadcast_type TEXT NOT NULL DEFAULT 'announcement',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_broadcasts ENABLE ROW LEVEL SECURITY;

-- RLS policies for team_broadcasts
CREATE POLICY "Managers can create broadcasts"
ON public.team_broadcasts FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'manager'
  )
);

CREATE POLICY "Team members can view broadcasts"
ON public.team_broadcasts FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM profiles 
    WHERE user_id = auth.uid() AND team_id IS NOT NULL
  )
);

-- Enable real-time for broadcasts
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_broadcasts;