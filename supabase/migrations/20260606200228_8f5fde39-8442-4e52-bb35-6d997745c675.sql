ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_calls_is_demo ON public.calls(is_demo) WHERE is_demo = true;