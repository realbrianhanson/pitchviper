-- Create enums for calls
CREATE TYPE public.call_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE public.call_outcome AS ENUM ('connected', 'voicemail', 'no_answer', 'wrong_number');
CREATE TYPE public.call_purpose AS ENUM ('cold_call', 'follow_up', 'appointment', 'demo', 'closing', 'support');

-- Create calls table
CREATE TABLE public.calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID REFERENCES public.teams(id),
  contact_name TEXT NOT NULL,
  company_name TEXT,
  phone_number TEXT,
  direction call_direction NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  outcome call_outcome NOT NULL,
  call_purpose call_purpose,
  disposition TEXT,
  appointment_scheduled_at TIMESTAMP WITH TIME ZONE,
  callback_scheduled_at TIMESTAMP WITH TIME ZONE,
  deal_value DECIMAL,
  notes TEXT,
  self_rating INTEGER CHECK (self_rating >= 1 AND self_rating <= 5),
  struggled_objections TEXT[],
  improvement_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert own calls"
  ON public.calls FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own calls"
  ON public.calls FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own calls"
  ON public.calls FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Team members can view team calls"
  ON public.calls FOR SELECT
  USING (
    team_id IS NOT NULL AND 
    team_id IN (
      SELECT team_id FROM profiles 
      WHERE user_id = auth.uid() AND team_id IS NOT NULL
    )
  );

-- Create index for faster queries
CREATE INDEX idx_calls_user_id ON public.calls(user_id);
CREATE INDEX idx_calls_team_id ON public.calls(team_id);
CREATE INDEX idx_calls_created_at ON public.calls(created_at DESC);