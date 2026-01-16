-- Create enums for badges
CREATE TYPE badge_category AS ENUM ('calls', 'closes', 'streaks', 'roleplay', 'training', 'team', 'special');
CREATE TYPE badge_requirement_type AS ENUM ('count', 'streak', 'score', 'custom');
CREATE TYPE badge_rarity AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');

-- Create levels table
CREATE TABLE public.levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_number INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  xp_required INTEGER NOT NULL,
  badge_icon TEXT NOT NULL,
  perks TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create badges table
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category badge_category NOT NULL,
  requirement_type badge_requirement_type NOT NULL,
  requirement_value INTEGER NOT NULL DEFAULT 1,
  requirement_description TEXT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 50,
  rarity badge_rarity NOT NULL DEFAULT 'common',
  is_secret BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_badges table
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for levels (everyone can view)
CREATE POLICY "Anyone can view levels"
  ON public.levels FOR SELECT
  USING (true);

-- RLS Policies for badges (everyone can view non-secret, earned users can see their secrets)
CREATE POLICY "Anyone can view non-secret badges"
  ON public.badges FOR SELECT
  USING (is_secret = false);

CREATE POLICY "Users can view their earned secret badges"
  ON public.badges FOR SELECT
  USING (
    is_secret = true AND 
    id IN (SELECT badge_id FROM public.user_badges WHERE user_id = auth.uid())
  );

-- RLS Policies for user_badges
CREATE POLICY "Users can view own badges"
  ON public.user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view team member badges"
  ON public.user_badges FOR SELECT
  USING (
    user_id IN (
      SELECT p2.user_id FROM profiles p1
      JOIN profiles p2 ON p1.team_id = p2.team_id
      WHERE p1.user_id = auth.uid() AND p1.team_id IS NOT NULL
    )
  );

CREATE POLICY "System can insert badges for users"
  ON public.user_badges FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes
CREATE INDEX idx_user_badges_user ON public.user_badges(user_id);
CREATE INDEX idx_user_badges_badge ON public.user_badges(badge_id);
CREATE INDEX idx_badges_category ON public.badges(category);
CREATE INDEX idx_badges_rarity ON public.badges(rarity);