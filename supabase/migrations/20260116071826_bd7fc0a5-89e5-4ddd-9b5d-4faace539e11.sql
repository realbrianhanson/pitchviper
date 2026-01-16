
-- Create deals table using the enums that were already created
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID REFERENCES public.teams(id),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  deal_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'prospecting',
  expected_close_date DATE,
  probability INTEGER DEFAULT 10 CHECK (probability >= 0 AND probability <= 100),
  deal_type TEXT NOT NULL DEFAULT 'new_business',
  source TEXT,
  notes TEXT,
  momentum_score INTEGER DEFAULT 50 CHECK (momentum_score >= 0 AND momentum_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  close_reason TEXT
);

-- Create deal stage history table
CREATE TABLE public.deal_stage_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_stage_history ENABLE ROW LEVEL SECURITY;

-- Deals RLS policies
CREATE POLICY "Users can view own deals"
  ON public.deals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Team members can view team deals"
  ON public.deals FOR SELECT
  USING (team_id IS NOT NULL AND team_id IN (
    SELECT team_id FROM profiles WHERE user_id = auth.uid() AND team_id IS NOT NULL
  ));

CREATE POLICY "Users can insert own deals"
  ON public.deals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deals"
  ON public.deals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own deals"
  ON public.deals FOR DELETE
  USING (auth.uid() = user_id);

-- Deal stage history RLS policies
CREATE POLICY "Users can view own deal history"
  ON public.deal_stage_history FOR SELECT
  USING (deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid()));

CREATE POLICY "Team members can view team deal history"
  ON public.deal_stage_history FOR SELECT
  USING (deal_id IN (
    SELECT id FROM deals WHERE team_id IN (
      SELECT team_id FROM profiles WHERE user_id = auth.uid() AND team_id IS NOT NULL
    )
  ));

CREATE POLICY "Users can insert deal history"
  ON public.deal_stage_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes
CREATE INDEX idx_deals_user_id ON public.deals(user_id);
CREATE INDEX idx_deals_team_id ON public.deals(team_id);
CREATE INDEX idx_deals_stage ON public.deals(stage);
CREATE INDEX idx_deal_history_deal_id ON public.deal_stage_history(deal_id);

-- Enable realtime for deals
ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;
