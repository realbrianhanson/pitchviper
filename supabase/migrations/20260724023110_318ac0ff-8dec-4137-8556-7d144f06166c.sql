
-- Ensure company_settings.setup_state jsonb column exists (mirrors live state).
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS setup_state jsonb NOT NULL DEFAULT '{}'::jsonb;
