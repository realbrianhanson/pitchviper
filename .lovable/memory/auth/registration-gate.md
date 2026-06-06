---
name: Registration Gate
description: Promo code and role selection happen in onboarding (post-signup), shared by email + Google sign-up
type: feature
---
- Sign-up (email or Google) creates an auth user. A DB trigger `handle_new_user` on `auth.users` auto-creates a `profiles` row and a default `user_roles` row with role `rep`.
- Promo code validation ("Viper") happens server-side in `validate-promo-code` edge function, called from the first onboarding step (`StepAccess`).
- `StepAccess` also lets the user pick Rep vs Manager (updates `user_roles.role`).
- On successful validation, `profiles.promo_validated` is set to `true`.
- `ProtectedRoute` blocks access to the app unless both `promo_validated` AND `onboarding_completed` are true — otherwise redirects to `/onboarding`. Applies to Google users too.
- Cancelling onboarding signs the user out.
- Google OAuth is enabled via Lovable managed auth (`lovable.auth.signInWithOAuth`).
