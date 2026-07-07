# Project Memory

## Core
- Always use `.maybeSingle()` instead of `.single()` for Supabase SELECT queries to avoid 406 errors.
- Google OAuth is disabled. Registration requires mandatory promo code "Viper" (validated server-side).
- Dashboard access requires `onboarding_completed` flag to be true (enforced via `ProtectedRoute`).
- `ghl_activities` is the canonical source for headline KPIs (calls today, pipeline, deals/revenue won this week) and the day streak. `daily_stats`/`activities`/Aloware calls remain for detail/history only.

## Memories
- [ElevenLabs Integration](mem://integrations/elevenlabs) — ElevenLabs agent settings, API key permissions, and WebRTC connection method
- [Registration Gate](mem://auth/registration-gate) — Mandatory promo code validation and disabled OAuth
- [Supabase Query Pattern](mem://architecture/supabase-query-pattern) — Prefer .maybeSingle() over .single() for SELECT queries
- [RLS Hardening](mem://security/rls-hardening) — RLS policies for manager roles and sensitive profile data
- [Onboarding Flow](mem://features/onboarding-flow) — Dashboard access restrictions based on onboarding status
- [Canonical Headline KPIs](mem://architecture/canonical-kpis) — ghl_activities is the single source for headline KPIs and streak; other sources are detail-only
