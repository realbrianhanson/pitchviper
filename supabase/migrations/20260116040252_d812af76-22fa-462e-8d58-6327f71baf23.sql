-- Create activity type enum
CREATE TYPE public.activity_type AS ENUM (
  'call_made',
  'call_received',
  'appointment_set',
  'deal_closed',
  'deal_lost',
  'roleplay_completed',
  'badge_earned',
  'level_up',
  'training_completed'
);

-- Create challenge type enum
CREATE TYPE public.challenge_type AS ENUM (
  'calls',
  'appointments',
  'roleplay',
  'objection_practice',
  'custom'
);

-- Create activities table
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  activity_type activity_type NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily_stats table
CREATE TABLE public.daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  calls_made INTEGER NOT NULL DEFAULT 0,
  calls_received INTEGER NOT NULL DEFAULT 0,
  appointments_set INTEGER NOT NULL DEFAULT 0,
  deals_closed INTEGER NOT NULL DEFAULT 0,
  deals_lost INTEGER NOT NULL DEFAULT 0,
  revenue_closed DECIMAL(12,2) NOT NULL DEFAULT 0,
  talk_time_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create daily_challenges table
CREATE TABLE public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type challenge_type NOT NULL,
  target_value INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_challenge_progress table
CREATE TABLE public.user_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES public.daily_challenges(id) ON DELETE CASCADE NOT NULL,
  current_progress INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- Enable RLS on all tables
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;

-- Activities RLS Policies
-- Users can view their own activities
CREATE POLICY "Users can view own activities"
ON public.activities FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can view team activities
CREATE POLICY "Users can view team activities"
ON public.activities FOR SELECT
TO authenticated
USING (
  team_id IS NOT NULL AND
  team_id IN (
    SELECT team_id FROM public.profiles WHERE user_id = auth.uid() AND team_id IS NOT NULL
  )
);

-- Users can insert their own activities
CREATE POLICY "Users can insert own activities"
ON public.activities FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Daily Stats RLS Policies
CREATE POLICY "Users can view own daily stats"
ON public.daily_stats FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily stats"
ON public.daily_stats FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily stats"
ON public.daily_stats FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Daily Challenges RLS Policies (everyone can view)
CREATE POLICY "Anyone can view daily challenges"
ON public.daily_challenges FOR SELECT
TO authenticated
USING (true);

-- User Challenge Progress RLS Policies
CREATE POLICY "Users can view own challenge progress"
ON public.user_challenge_progress FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenge progress"
ON public.user_challenge_progress FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenge progress"
ON public.user_challenge_progress FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime for activities table
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;

-- Create indexes for better performance
CREATE INDEX idx_activities_user_id ON public.activities(user_id);
CREATE INDEX idx_activities_team_id ON public.activities(team_id);
CREATE INDEX idx_activities_created_at ON public.activities(created_at DESC);
CREATE INDEX idx_daily_stats_user_date ON public.daily_stats(user_id, date);
CREATE INDEX idx_daily_challenges_date ON public.daily_challenges(challenge_date);
CREATE INDEX idx_user_challenge_progress_user ON public.user_challenge_progress(user_id);

-- Function to get or create today's stats for a user
CREATE OR REPLACE FUNCTION public.get_or_create_daily_stats(p_user_id UUID)
RETURNS public.daily_stats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.daily_stats;
BEGIN
  -- Try to get existing stats
  SELECT * INTO result
  FROM public.daily_stats
  WHERE user_id = p_user_id AND date = CURRENT_DATE;
  
  -- If not found, create new record
  IF NOT FOUND THEN
    INSERT INTO public.daily_stats (user_id, date)
    VALUES (p_user_id, CURRENT_DATE)
    RETURNING * INTO result;
  END IF;
  
  RETURN result;
END;
$$;

-- Function to log activity and update stats
CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id UUID,
  p_activity_type activity_type,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS public.activities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_activity public.activities;
BEGIN
  -- Get user's team
  SELECT team_id INTO v_team_id
  FROM public.profiles
  WHERE user_id = p_user_id;
  
  -- Insert activity
  INSERT INTO public.activities (user_id, team_id, activity_type, metadata)
  VALUES (p_user_id, v_team_id, p_activity_type, p_metadata)
  RETURNING * INTO v_activity;
  
  -- Update daily stats based on activity type
  INSERT INTO public.daily_stats (user_id, date)
  VALUES (p_user_id, CURRENT_DATE)
  ON CONFLICT (user_id, date) DO NOTHING;
  
  CASE p_activity_type
    WHEN 'call_made' THEN
      UPDATE public.daily_stats
      SET calls_made = calls_made + 1,
          talk_time_minutes = talk_time_minutes + COALESCE((p_metadata->>'duration_minutes')::INTEGER, 0)
      WHERE user_id = p_user_id AND date = CURRENT_DATE;
    WHEN 'call_received' THEN
      UPDATE public.daily_stats
      SET calls_received = calls_received + 1,
          talk_time_minutes = talk_time_minutes + COALESCE((p_metadata->>'duration_minutes')::INTEGER, 0)
      WHERE user_id = p_user_id AND date = CURRENT_DATE;
    WHEN 'appointment_set' THEN
      UPDATE public.daily_stats
      SET appointments_set = appointments_set + 1
      WHERE user_id = p_user_id AND date = CURRENT_DATE;
    WHEN 'deal_closed' THEN
      UPDATE public.daily_stats
      SET deals_closed = deals_closed + 1,
          revenue_closed = revenue_closed + COALESCE((p_metadata->>'value')::DECIMAL, 0)
      WHERE user_id = p_user_id AND date = CURRENT_DATE;
    WHEN 'deal_lost' THEN
      UPDATE public.daily_stats
      SET deals_lost = deals_lost + 1
      WHERE user_id = p_user_id AND date = CURRENT_DATE;
    ELSE
      -- Other activity types don't update stats
      NULL;
  END CASE;
  
  RETURN v_activity;
END;
$$;

-- Function to calculate user streak
CREATE OR REPLACE FUNCTION public.calculate_streak(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak INTEGER := 0;
  v_check_date DATE := CURRENT_DATE;
  v_completed BOOLEAN;
BEGIN
  LOOP
    -- Check if user completed challenge on this date
    SELECT EXISTS (
      SELECT 1
      FROM public.user_challenge_progress ucp
      JOIN public.daily_challenges dc ON dc.id = ucp.challenge_id
      WHERE ucp.user_id = p_user_id
        AND dc.challenge_date = v_check_date
        AND ucp.completed = true
    ) INTO v_completed;
    
    -- If today and not completed, check yesterday for current streak
    IF v_check_date = CURRENT_DATE AND NOT v_completed THEN
      v_check_date := v_check_date - 1;
      CONTINUE;
    END IF;
    
    -- If completed, increment streak
    IF v_completed THEN
      v_streak := v_streak + 1;
      v_check_date := v_check_date - 1;
    ELSE
      -- Streak broken
      EXIT;
    END IF;
    
    -- Safety limit
    IF v_streak > 365 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN v_streak;
END;
$$;

-- Insert sample daily challenge for today
INSERT INTO public.daily_challenges (challenge_date, title, description, challenge_type, target_value, xp_reward)
VALUES (CURRENT_DATE, 'Cold Call Champion', 'Make 15 cold calls today to earn bonus XP and climb the leaderboard.', 'calls', 15, 250)
ON CONFLICT (challenge_date) DO NOTHING;