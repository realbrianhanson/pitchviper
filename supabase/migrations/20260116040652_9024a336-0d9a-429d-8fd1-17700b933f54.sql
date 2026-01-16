-- Create user_status enum
CREATE TYPE public.user_status_type AS ENUM ('available', 'on_call', 'in_meeting', 'away', 'offline');

-- Create user_status table for real-time presence tracking
CREATE TABLE public.user_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  status public.user_status_type NOT NULL DEFAULT 'available',
  current_call_started_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

-- Policies for user_status
CREATE POLICY "Users can view all team member statuses"
ON public.user_status
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p1
    JOIN public.profiles p2 ON p1.team_id = p2.team_id
    WHERE p1.user_id = auth.uid() 
    AND p2.user_id = user_status.user_id
    AND p1.team_id IS NOT NULL
  )
);

CREATE POLICY "Users can update own status"
ON public.user_status
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own status"
ON public.user_status
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_user_status_updated_at
BEFORE UPDATE ON public.user_status
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for user_status
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_status;

-- Add RLS policy for team members to see each other's profiles
CREATE POLICY "Team members can view each other profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id 
  OR (
    team_id IS NOT NULL 
    AND team_id IN (
      SELECT team_id FROM public.profiles WHERE user_id = auth.uid() AND team_id IS NOT NULL
    )
  )
);

-- Function to get or create user status
CREATE OR REPLACE FUNCTION public.get_or_create_user_status(p_user_id UUID)
RETURNS public.user_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.user_status;
BEGIN
  SELECT * INTO result
  FROM public.user_status
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.user_status (user_id)
    VALUES (p_user_id)
    RETURNING * INTO result;
  END IF;
  
  RETURN result;
END;
$$;

-- Function to update user status
CREATE OR REPLACE FUNCTION public.update_user_status(
  p_user_id UUID,
  p_status public.user_status_type,
  p_call_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS public.user_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.user_status;
BEGIN
  INSERT INTO public.user_status (user_id, status, current_call_started_at, last_activity_at)
  VALUES (p_user_id, p_status, p_call_started_at, now())
  ON CONFLICT (user_id) DO UPDATE SET
    status = p_status,
    current_call_started_at = p_call_started_at,
    last_activity_at = now(),
    updated_at = now()
  RETURNING * INTO result;
  
  RETURN result;
END;
$$;