
ALTER VIEW public.team_profiles_safe SET (security_invoker = true);

REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_default_channels() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.post_deal_closed_to_wins() FROM PUBLIC, anon, authenticated;
