-- Create audio training scores table
CREATE TABLE public.audio_training_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('practice', 'challenge', 'random_fire')),
  objections_handled INTEGER NOT NULL DEFAULT 0,
  correct_responses INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create manager audio examples table
CREATE TABLE public.manager_audio_examples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES public.objection_responses(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audio_training_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_audio_examples ENABLE ROW LEVEL SECURITY;

-- RLS policies for audio_training_scores
CREATE POLICY "Users can view all audio training scores"
  ON public.audio_training_scores FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own scores"
  ON public.audio_training_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS policies for manager_audio_examples
CREATE POLICY "Anyone can view audio examples"
  ON public.manager_audio_examples FOR SELECT
  USING (true);

CREATE POLICY "Managers can add audio examples"
  ON public.manager_audio_examples FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY "Managers can delete their audio examples"
  ON public.manager_audio_examples FOR DELETE
  USING (auth.uid() = recorded_by);

-- Create indexes
CREATE INDEX idx_audio_training_scores_user_id ON public.audio_training_scores(user_id);
CREATE INDEX idx_audio_training_scores_mode ON public.audio_training_scores(mode);
CREATE INDEX idx_manager_audio_examples_response_id ON public.manager_audio_examples(response_id);