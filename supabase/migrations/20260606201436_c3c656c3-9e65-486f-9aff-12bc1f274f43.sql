ALTER PUBLICATION supabase_realtime ADD TABLE public.ghl_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER TABLE public.ghl_activities REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;