ALTER TABLE public.ghl_activities
  ADD COLUMN IF NOT EXISTS value numeric,
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ghl_activities_is_demo ON public.ghl_activities(is_demo);
CREATE INDEX IF NOT EXISTS idx_ghl_activities_occurred_at ON public.ghl_activities(occurred_at DESC);