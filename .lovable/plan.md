## Security Fix Plan

Skipping the `PROMO_CODES` and `ALOWARE_WEBHOOK_SECRET` secret additions per your request. The remaining findings will be fixed via DB migrations and edge function code changes.

### 1. Database migration (RLS hardening)
- **calls / deals**: Restrict team-wide SELECT to managers only; owners still see their own rows.
- **sms_messages**: Tighten manager SELECT to scope by team and add realtime channel protection.
- **realtime.messages**: Add RLS policies so authenticated users can only subscribe to topics for their own team / user id.
- **competition_participants**: Add WITH CHECK that the competition's `team_id` matches the joiner's team.
- **objection_responses**: Restrict SELECT to `authenticated` role.
- **user_certifications**: Remove self-INSERT policy; only service role can award.
- **profiles**: Replace team-visible policy so `aloware_user_id` and `default_aloware_line` aren't exposed (use a view or column-level approach via a restricted policy + separate manager-only policy).
- **SECURITY DEFINER helpers** (`get_user_team_id`, `get_user_role`, `has_role`, etc.): `REVOKE EXECUTE ... FROM PUBLIC, anon`; grant only to `authenticated` and `service_role`.

### 2. Edge function auth hardening
Add JWT verification (`Authorization: Bearer` + `supabase.auth.getClaims`) and ownership/role checks to:
- `check-badge-eligibility`, `roleplay-analyze`, `roleplay-chat` — verify caller matches `user_id` / session owner.
- `generate-coaching-insights`, `generate-manager-insights`, `generate-forecast`, `calculate-leaderboard` — verify caller is the rep or a manager on the requested team.
- `perplexity-research`, `research-prospect`, `evaluate-gauntlet`, `score-objection-response`, `generate-daily-gauntlet` — require valid JWT to stop anonymous AI-credit abuse.

### 3. Aloware webhook
- `aloware-webhook-receiver`: Require `X-Aloware-Signature` header and compare (constant-time) to `Deno.env.get('ALOWARE_WEBHOOK_SECRET')`. Since you're skipping the secret add, the function will reject all requests until you add the secret later — I'll note this clearly in the code and findings.

### 4. Promo code
- `validate-promo-code`: Already rewritten to read from `PROMO_CODES` env. Since you're skipping that secret too, validation will fail until the secret is added. I'll leave the code as-is.

### 5. Public storage bucket listing
- Replace the broad `storage.objects` SELECT policy on the public bucket with a narrower policy that allows reads of specific objects but not directory listing.

### 6. Mark findings
After applying fixes, mark resolved findings as fixed via the security tool, and ignore the two secret-dependent ones (`webhook_no_signature`, `hardcoded_promo_code`) with a note that you opted to add the secrets later.

### Notes
- No frontend changes required — all hooks already pass the user's JWT via the supabase client.
- The two skipped secrets (`PROMO_CODES`, `ALOWARE_WEBHOOK_SECRET`) can be added anytime from the backend secrets panel; the code is already wired to read them.
