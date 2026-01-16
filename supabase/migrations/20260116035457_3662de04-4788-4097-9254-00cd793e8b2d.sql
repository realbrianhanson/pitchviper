-- Create teams table first (profiles will reference it)
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  team_code TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Extend profiles table with additional fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS phone_extension TEXT,
  ADD COLUMN IF NOT EXISTS hire_date DATE,
  ADD COLUMN IF NOT EXISTS xp_points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id),
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Teams RLS Policies
-- Anyone authenticated can view teams (for joining)
CREATE POLICY "Authenticated users can view teams"
ON public.teams FOR SELECT
TO authenticated
USING (true);

-- Only managers can create teams
CREATE POLICY "Managers can create teams"
ON public.teams FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'manager'
  )
);

-- Team creator can update their team
CREATE POLICY "Team creators can update their team"
ON public.teams FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Storage policies for avatars bucket
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Function to generate unique team code
CREATE OR REPLACE FUNCTION public.generate_team_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-character alphanumeric code
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if code already exists
    SELECT EXISTS (SELECT 1 FROM public.teams WHERE team_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;