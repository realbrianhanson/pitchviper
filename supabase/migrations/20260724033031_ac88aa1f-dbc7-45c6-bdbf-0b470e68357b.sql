DROP VIEW IF EXISTS public.team_profiles_safe;
CREATE VIEW public.team_profiles_safe
WITH (security_invoker = off, security_barrier = true) AS
SELECT
  p.id,
  p.user_id,
  p.team_id,
  p.full_name,
  p.avatar_url,
  p.title,
  p.current_level,
  p.xp_points,
  p.current_streak,
  p.longest_streak,
  p.hire_date,
  p.phone_extension,
  p.onboarding_completed,
  p.last_coached_at,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE p.team_id IS NOT NULL
  AND p.team_id = public.get_user_team_id(auth.uid());

REVOKE ALL ON public.team_profiles_safe FROM PUBLIC, anon;
GRANT SELECT ON public.team_profiles_safe TO authenticated;
GRANT SELECT ON public.team_profiles_safe TO service_role;