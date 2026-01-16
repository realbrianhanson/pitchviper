-- Create enums for objections
CREATE TYPE objection_category AS ENUM ('price', 'timing', 'competition', 'authority', 'need', 'trust', 'stall');
CREATE TYPE objection_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE response_approach AS ENUM ('empathy', 'logic', 'redirect', 'question', 'social_proof');

-- Create objections table
CREATE TABLE public.objections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  objection_text TEXT NOT NULL,
  category objection_category NOT NULL,
  difficulty objection_difficulty NOT NULL,
  context TEXT,
  created_by UUID REFERENCES auth.users(id),
  team_id UUID REFERENCES public.teams(id),
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create objection_responses table
CREATE TABLE public.objection_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  objection_id UUID NOT NULL REFERENCES public.objections(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  approach response_approach NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  times_used INTEGER NOT NULL DEFAULT 0,
  times_successful INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.objections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objection_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for objections
CREATE POLICY "Anyone can view approved objections"
  ON public.objections FOR SELECT
  USING (is_approved = true);

CREATE POLICY "Users can view team objections"
  ON public.objections FOR SELECT
  USING (team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid() AND team_id IS NOT NULL));

CREATE POLICY "Authenticated users can insert objections"
  ON public.objections FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own objections"
  ON public.objections FOR UPDATE
  USING (created_by = auth.uid());

-- RLS Policies for objection_responses
CREATE POLICY "Anyone can view responses"
  ON public.objection_responses FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert responses"
  ON public.objection_responses FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own responses"
  ON public.objection_responses FOR UPDATE
  USING (created_by = auth.uid());

-- Create indexes
CREATE INDEX idx_objections_category ON public.objections(category);
CREATE INDEX idx_objections_difficulty ON public.objections(difficulty);
CREATE INDEX idx_objection_responses_objection_id ON public.objection_responses(objection_id);