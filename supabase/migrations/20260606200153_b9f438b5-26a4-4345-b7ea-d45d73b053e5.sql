ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_is_demo ON public.profiles(is_demo) WHERE is_demo = true;