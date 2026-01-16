-- Create enum for toolkit item types
CREATE TYPE toolkit_item_type AS ENUM ('quick_win', 'battlecard', 'proof_point', 'script');

-- Create toolkit_items table
CREATE TABLE public.toolkit_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id),
  item_type toolkit_item_type NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create toolkit_usage table
CREATE TABLE public.toolkit_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  item_id UUID NOT NULL REFERENCES public.toolkit_items(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.toolkit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toolkit_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for toolkit_items
CREATE POLICY "Anyone can view active global toolkit items"
  ON public.toolkit_items FOR SELECT
  USING (is_active = true AND team_id IS NULL);

CREATE POLICY "Team members can view team toolkit items"
  ON public.toolkit_items FOR SELECT
  USING (team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid() AND team_id IS NOT NULL));

CREATE POLICY "Managers can insert toolkit items"
  ON public.toolkit_items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can update toolkit items"
  ON public.toolkit_items FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for toolkit_usage
CREATE POLICY "Users can view own usage"
  ON public.toolkit_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON public.toolkit_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_toolkit_items_type ON public.toolkit_items(item_type);
CREATE INDEX idx_toolkit_items_category ON public.toolkit_items(category);
CREATE INDEX idx_toolkit_usage_user ON public.toolkit_usage(user_id);
CREATE INDEX idx_toolkit_usage_item ON public.toolkit_usage(item_id);