-- Create company_settings table for product context in roleplay
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT '',
  product_description TEXT NOT NULL DEFAULT '',
  value_propositions TEXT[] NOT NULL DEFAULT '{}',
  common_use_cases TEXT[] NOT NULL DEFAULT '{}',
  industry TEXT,
  target_audience TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id)
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their team's company settings"
ON public.company_settings FOR SELECT
USING (
  team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
  OR team_id IS NULL
);

CREATE POLICY "Managers can insert company settings"
ON public.company_settings FOR INSERT
WITH CHECK (
  team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
  AND public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Managers can update company settings"
ON public.company_settings FOR UPDATE
USING (
  team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
  AND public.has_role(auth.uid(), 'manager')
);

-- Trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();