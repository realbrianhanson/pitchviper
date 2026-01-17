-- Create a security definer function to get user's team_id without recursion
CREATE OR REPLACE FUNCTION public.get_user_team_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id
  FROM public.profiles
  WHERE user_id = p_user_id
  LIMIT 1
$$;

-- Drop existing problematic policies on profiles
DROP POLICY IF EXISTS "Team members can view each other profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new non-recursive policies
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Team members can view each other profiles"
ON public.profiles
FOR SELECT
USING (
  team_id IS NOT NULL 
  AND team_id = public.get_user_team_id(auth.uid())
);

-- Fix user_status policies that also reference profiles
DROP POLICY IF EXISTS "Team members can view team status" ON public.user_status;

-- Create a simpler policy for user_status
CREATE POLICY "Users can view own status"
ON public.user_status
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Team members can view team status"
ON public.user_status
FOR SELECT
USING (
  user_id IN (
    SELECT p.user_id 
    FROM public.profiles p 
    WHERE p.team_id = public.get_user_team_id(auth.uid())
  )
);