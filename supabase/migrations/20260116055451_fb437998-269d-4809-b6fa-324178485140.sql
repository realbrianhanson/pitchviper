-- Create competition_metric_type enum
CREATE TYPE public.competition_metric_type AS ENUM ('calls', 'appointments', 'revenue', 'deals', 'roleplay', 'custom');

-- Create competition_status enum
CREATE TYPE public.competition_status AS ENUM ('upcoming', 'active', 'completed', 'cancelled');

-- Create competitions table
CREATE TABLE public.competitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  metric_type public.competition_metric_type NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  prize_description TEXT,
  prize_value DECIMAL,
  number_of_winners INTEGER NOT NULL DEFAULT 1,
  qualifying_threshold INTEGER,
  created_by UUID NOT NULL,
  status public.competition_status NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create competition_participants table (for selective participation)
CREATE TABLE public.competition_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  current_value DECIMAL NOT NULL DEFAULT 0,
  rank INTEGER,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(competition_id, user_id)
);

-- Create competition_activity table for tracking position changes
CREATE TABLE public.competition_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL, -- 'rank_change', 'new_leader', 'achievement'
  previous_rank INTEGER,
  new_rank INTEGER,
  value_change DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_activity ENABLE ROW LEVEL SECURITY;

-- Competitions policies
CREATE POLICY "Team members can view team competitions"
ON public.competitions
FOR SELECT
USING (
  team_id IS NULL 
  OR team_id IN (
    SELECT team_id FROM profiles WHERE user_id = auth.uid() AND team_id IS NOT NULL
  )
);

CREATE POLICY "Managers can create competitions"
ON public.competitions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() AND role = 'manager'
  )
);

CREATE POLICY "Managers can update their competitions"
ON public.competitions
FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Managers can delete their competitions"
ON public.competitions
FOR DELETE
USING (created_by = auth.uid());

-- Competition participants policies
CREATE POLICY "Users can view competition participants"
ON public.competition_participants
FOR SELECT
USING (
  competition_id IN (
    SELECT id FROM competitions WHERE team_id IN (
      SELECT team_id FROM profiles WHERE user_id = auth.uid() AND team_id IS NOT NULL
    ) OR team_id IS NULL
  )
);

CREATE POLICY "Users can join competitions"
ON public.competition_participants
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update participant standings"
ON public.competition_participants
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Competition activity policies
CREATE POLICY "Users can view competition activity"
ON public.competition_activity
FOR SELECT
USING (
  competition_id IN (
    SELECT id FROM competitions WHERE team_id IN (
      SELECT team_id FROM profiles WHERE user_id = auth.uid() AND team_id IS NOT NULL
    ) OR team_id IS NULL
  )
);

CREATE POLICY "System can insert activity"
ON public.competition_activity
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for competitions
ALTER PUBLICATION supabase_realtime ADD TABLE public.competitions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.competition_participants;