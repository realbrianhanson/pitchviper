-- Create prospect research table
CREATE TABLE public.prospect_research (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  company_url TEXT,
  contact_name TEXT,
  contact_linkedin_url TEXT,
  research_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

-- Enable RLS
ALTER TABLE public.prospect_research ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own research"
  ON public.prospect_research FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own research"
  ON public.prospect_research FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own research"
  ON public.prospect_research FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own research"
  ON public.prospect_research FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_prospect_research_user_id ON public.prospect_research(user_id);
CREATE INDEX idx_prospect_research_company_name ON public.prospect_research(company_name);
CREATE INDEX idx_prospect_research_expires_at ON public.prospect_research(expires_at);