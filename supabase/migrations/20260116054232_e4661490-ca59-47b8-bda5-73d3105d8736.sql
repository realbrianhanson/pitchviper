-- Create coaching_sessions table
CREATE TABLE public.coaching_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID NOT NULL,
  rep_id UUID NOT NULL,
  notes TEXT NOT NULL,
  focus_areas TEXT[] DEFAULT '{}',
  action_items TEXT[] DEFAULT '{}',
  next_session_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add last_coached_at column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_coached_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for coaching_sessions
CREATE POLICY "Managers can view coaching sessions they created"
ON public.coaching_sessions
FOR SELECT
USING (manager_id = auth.uid());

CREATE POLICY "Managers can insert coaching sessions"
ON public.coaching_sessions
FOR INSERT
WITH CHECK (
  manager_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'manager'
  )
);

CREATE POLICY "Reps can view their own coaching sessions"
ON public.coaching_sessions
FOR SELECT
USING (rep_id = auth.uid());

CREATE POLICY "Managers can update their own coaching sessions"
ON public.coaching_sessions
FOR UPDATE
USING (manager_id = auth.uid());

-- Create index for performance
CREATE INDEX idx_coaching_sessions_rep_id ON public.coaching_sessions(rep_id);
CREATE INDEX idx_coaching_sessions_manager_id ON public.coaching_sessions(manager_id);
CREATE INDEX idx_coaching_sessions_created_at ON public.coaching_sessions(created_at DESC);