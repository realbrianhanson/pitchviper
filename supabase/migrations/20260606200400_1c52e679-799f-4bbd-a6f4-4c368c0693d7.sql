INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES
  ('00000000-0000-0000-0000-000000000000','a1111111-1111-4111-8111-111111111111','authenticated','authenticated','demo+marcus@pitchviper.local','',now(),'{"provider":"demo","providers":["demo"]}'::jsonb,'{"full_name":"Marcus Chen","is_demo":true}'::jsonb,now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a2222222-2222-4222-8222-222222222222','authenticated','authenticated','demo+sasha@pitchviper.local','',now(),'{"provider":"demo","providers":["demo"]}'::jsonb,'{"full_name":"Sasha Williams","is_demo":true}'::jsonb,now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a3333333-3333-4333-8333-333333333333','authenticated','authenticated','demo+diego@pitchviper.local','',now(),'{"provider":"demo","providers":["demo"]}'::jsonb,'{"full_name":"Diego Reyes","is_demo":true}'::jsonb,now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a4444444-4444-4444-8444-444444444444','authenticated','authenticated','demo+priya@pitchviper.local','',now(),'{"provider":"demo","providers":["demo"]}'::jsonb,'{"full_name":"Priya Patel","is_demo":true}'::jsonb,now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a5555555-5555-4555-8555-555555555555','authenticated','authenticated','demo+tyler@pitchviper.local','',now(),'{"provider":"demo","providers":["demo"]}'::jsonb,'{"full_name":"Tyler Brooks","is_demo":true}'::jsonb,now(),now(),'','','','')
ON CONFLICT (id) DO NOTHING;

-- Backfill profile fields the trigger doesn't set
UPDATE public.profiles SET
  title = CASE user_id
    WHEN 'a1111111-1111-4111-8111-111111111111'::uuid THEN 'Senior AE'
    WHEN 'a2222222-2222-4222-8222-222222222222'::uuid THEN 'Account Exec'
    WHEN 'a3333333-3333-4333-8333-333333333333'::uuid THEN 'SDR Lead'
    WHEN 'a4444444-4444-4444-8444-444444444444'::uuid THEN 'Account Exec'
    WHEN 'a5555555-5555-4555-8555-555555555555'::uuid THEN 'SDR'
  END,
  current_level = CASE user_id
    WHEN 'a1111111-1111-4111-8111-111111111111'::uuid THEN 6
    WHEN 'a2222222-2222-4222-8222-222222222222'::uuid THEN 5
    WHEN 'a3333333-3333-4333-8333-333333333333'::uuid THEN 4
    WHEN 'a4444444-4444-4444-8444-444444444444'::uuid THEN 3
    WHEN 'a5555555-5555-4555-8555-555555555555'::uuid THEN 2
  END,
  xp_points = CASE user_id
    WHEN 'a1111111-1111-4111-8111-111111111111'::uuid THEN 4750
    WHEN 'a2222222-2222-4222-8222-222222222222'::uuid THEN 3300
    WHEN 'a3333333-3333-4333-8333-333333333333'::uuid THEN 2425
    WHEN 'a4444444-4444-4444-8444-444444444444'::uuid THEN 1700
    WHEN 'a5555555-5555-4555-8555-555555555555'::uuid THEN 975
  END,
  current_streak = (random()*6)::int + 2,
  longest_streak = (random()*10)::int + 8,
  onboarding_completed = true,
  promo_validated = true,
  is_demo = true
WHERE user_id IN (
  'a1111111-1111-4111-8111-111111111111'::uuid,
  'a2222222-2222-4222-8222-222222222222'::uuid,
  'a3333333-3333-4333-8333-333333333333'::uuid,
  'a4444444-4444-4444-8444-444444444444'::uuid,
  'a5555555-5555-4555-8555-555555555555'::uuid
);