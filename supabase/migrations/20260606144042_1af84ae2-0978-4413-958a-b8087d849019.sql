
-- 1. Add promo_validated flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS promo_validated boolean NOT NULL DEFAULT false;

-- 2. Trigger function: auto-create profile + default rep role for every new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, v_full_name)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'rep'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Allow users to update their own role during onboarding (rep <-> manager)
DROP POLICY IF EXISTS "Users can update their own role" ON public.user_roles;
CREATE POLICY "Users can update their own role"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND role IN ('rep'::app_role, 'manager'::app_role));
