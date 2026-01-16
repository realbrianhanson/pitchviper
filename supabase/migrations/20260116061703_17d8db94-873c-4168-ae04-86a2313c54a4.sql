-- Create enum for gauntlet challenge types
CREATE TYPE public.gauntlet_challenge_type AS ENUM (
  'objection_blast',
  'pitch_perfect', 
  'discovery_questions',
  'spot_the_mistake',
  'quick_math',
  'competitor_quiz',
  'scenario_response'
);

-- Create gauntlet_challenges table
CREATE TABLE public.gauntlet_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_date DATE NOT NULL UNIQUE,
  challenge_type public.gauntlet_challenge_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  time_limit_seconds INTEGER DEFAULT 300,
  xp_reward INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_gauntlet_completions table
CREATE TABLE public.user_gauntlet_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.gauntlet_challenges(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 1,
  responses JSONB DEFAULT '{}',
  feedback JSONB DEFAULT '{}',
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- Enable RLS
ALTER TABLE public.gauntlet_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gauntlet_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gauntlet_challenges (everyone can read)
CREATE POLICY "Anyone can view gauntlet challenges"
ON public.gauntlet_challenges
FOR SELECT
USING (true);

-- RLS Policies for user_gauntlet_completions
CREATE POLICY "Users can view their own completions"
ON public.user_gauntlet_completions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own completions"
ON public.user_gauntlet_completions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own completions"
ON public.user_gauntlet_completions
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_gauntlet_challenges_date ON public.gauntlet_challenges(challenge_date);
CREATE INDEX idx_user_gauntlet_completions_user ON public.user_gauntlet_completions(user_id);
CREATE INDEX idx_user_gauntlet_completions_challenge ON public.user_gauntlet_completions(challenge_id);

-- Seed today's challenge
INSERT INTO public.gauntlet_challenges (challenge_date, challenge_type, title, description, content, time_limit_seconds, xp_reward)
VALUES (
  CURRENT_DATE,
  'objection_blast',
  'Objection Blast',
  'Handle 5 common objections in 30 seconds each. Score 70%+ to pass!',
  '{
    "objections": [
      {"id": 1, "text": "We don''t have the budget for this right now.", "time_limit": 30},
      {"id": 2, "text": "I need to talk to my partner before making any decisions.", "time_limit": 30},
      {"id": 3, "text": "We''re already working with a competitor.", "time_limit": 30},
      {"id": 4, "text": "Can you just send me some information to review?", "time_limit": 30},
      {"id": 5, "text": "I''m not sure this is the right solution for us.", "time_limit": 30}
    ],
    "passing_score": 70
  }',
  150,
  75
);