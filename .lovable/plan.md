
# Batch 2 — Secure Team Invitations (audit + plan)

## Current state (verified by reading the code)

- `supabase/functions/create-team-member/index.ts` implements four actions: `create` (manager submits email + plaintext password, edge function calls `auth.admin.createUser({ email_confirm: true, password })`, then INSERTs a `profiles` row with `team_id` and an `INSERT` into `user_roles` with `'rep'`), `list`, `get-aloware-users`, and `reset-password` (manager submits a new plaintext password, function calls `auth.admin.updateUserById(userId, { password })`).
- `src/components/settings/TeamMembersManager.tsx` has a client-side `generatePassword()` that produces a 12-char string, a create form that transmits `password` in the request body, a "Reset password" dialog that does the same, and a `createdUsers` state that keeps the plaintext password in-memory and renders it with copy/eye toggles.
- DB trigger `handle_new_user` (in project knowledge) already inserts into `profiles` (`full_name` derived from user metadata) and `user_roles` (`'rep'`), both `ON CONFLICT DO NOTHING`. So the current function is double-inserting profile/role; the ON CONFLICT hides it, but the function's manual insert is what actually sets `team_id` and `aloware_user_id`.
- `src/pages/Onboarding.tsx` reads `profile.promo_validated` and skips step 1 when it's already true; navigates to `/` when both `promo_validated` and `onboarding_completed` are true.
- `src/components/auth/ProtectedRoute.tsx` requires `promo_validated === true && onboarding_completed === true` for protected app routes; `/onboarding` is reachable to any signed-in user.
- `src/pages/ResetPassword.tsx` already handles the recovery/invite hash flow at `/reset-password` and calls `supabase.auth.updateUser({ password })`.
- `supabase/config.toml` sets `verify_jwt = false` project-wide for functions; each function must validate the JWT itself (Batch 1 pattern).
- Shared helper `supabase/functions/_shared/rateLimit.ts` and the `edge_rate_limits` table + `check_and_increment_rate_limit` RPC already exist from Security Pass 2.

## Goals

1. Manager submits `full_name`, `email`, optional `aloware_user_id`. Nothing else.
2. Invitee receives a single-use Supabase invitation email, clicks it, sets their own password on `/reset-password`, and lands in `/onboarding`.
3. Invited user is force-attached to the inviting manager's `team_id`, forced to role `rep`, and bypasses the promo-code step.
4. Managers never see, generate, copy, reset, or transmit passwords. Password/reset is fully self-service via `/forgot-password`.

## 1. Files to change

**Edge function**
- `supabase/functions/create-team-member/index.ts` — rewrite:
  - Remove actions `reset-password` and the `password` field from `create`.
  - Rename `create` payload to `{ action: "invite", email, fullName, alowareUserId? }`.
  - Validate with Zod (email format, `fullName` 1–120 chars, optional `alowareUserId` string ≤ 64 chars, trim + lowercase email).
  - Manager authorization: `getUser(token)`, `has_role(user.id, 'manager')` via RPC (safer than joining user_roles), fetch manager's `team_id` from `profiles`; 401/403 with generic messages.
  - Rate limit via `check_and_increment_rate_limit` (5/min, 50/day per manager).
  - Duplicate handling: look up an existing auth user by email via `auth.admin.listUsers({ email })` or a paginated search:
    - If user exists AND already has a profile with `team_id = manager's team` → return `{ success: true, status: "already_member" }` (idempotent, no invite sent).
    - If user exists AND has a profile on a different team → return generic 409 `{ success: false, code: "email_unavailable" }` (do not leak which team).
    - If user exists but has never signed in (invited/unconfirmed) → call `auth.admin.inviteUserByEmail` again (Supabase treats this as a resend when the user is still unconfirmed) and update profile team/name/aloware fields. Return `{ status: "resent" }`.
  - Fresh invite path: `auth.admin.inviteUserByEmail(email, { data: { full_name, invited_team_id, invited_role: 'rep', invite_source: 'team_manager', invited_by: manager.id, aloware_user_id }, redirectTo: '<SITE_URL>/reset-password?flow=invite' })`.
  - After the invite returns the new `user.id`, `UPSERT` into `profiles` (`user_id`, `full_name`, `team_id`, `aloware_user_id`, `promo_validated = true`, `onboarding_completed = false`) using `onConflict: 'user_id'`. Do NOT insert into `user_roles` (trigger handles it, and manual insert would fight the new "no self-promotion" RLS). Verify via SELECT that the `handle_new_user` trigger set role = `rep`; if it somehow set anything else (shouldn't for invited users), leave it — the anti-privilege-escalation rules from Security Pass 1 mean we do NOT overwrite roles here.
  - `list` action stays but returns only non-sensitive fields; add `invited_at`/`last_sign_in_at` derived from `auth.admin.getUserById` (batched) so the UI can show "Invited" vs "Active".
  - Add a new action `resend-invite` (see §5) — same auth + rate limit, checks the target is on the manager's team AND `last_sign_in_at IS NULL`, then calls `inviteUserByEmail` again. Return generic success regardless of whether user existed, to avoid enumeration.
  - Never log email/full_name/token/link; log only `{ managerId, action, status }`.

**Frontend**
- `src/components/settings/TeamMembersManager.tsx` — rewrite:
  - Remove `generatePassword`, `password`, `showPasswords`, `createdUsers`, `newPassword`, the reset dialog, and every copy/eye/password UI element.
  - Invite form: Full name, Email, optional Aloware user select. Submit → `invite` action → toast "Invitation sent to <email>. They'll set their own password."
  - Roster: show `Invited` badge when `last_sign_in_at` is null, else `Active`. Row menu offers only "Resend invitation" (disabled if `Active`) — no password controls.
  - No plaintext password ever enters React state, props, or the DOM.

**Onboarding**
- `src/pages/Onboarding.tsx` — invited users already satisfy the "skip promo" branch because we set `promo_validated = true` on invite. Verify `StepTeam` respects an existing `profile.team_id` and skips team selection (or add an early-return when `profile.team_id` is set and `promo_validated` is true, jumping to Step 3/Profile). This is the only onboarding change — read `StepTeam.tsx` during build to confirm.
- `src/pages/ResetPassword.tsx` — accept `type=invite` in addition to `type=recovery`; after a successful `updateUser({ password })` for an invited user, `navigate('/onboarding')` instead of `/`. Detect via `?flow=invite` query param carried through `redirectTo`, or by reading `user.user_metadata.invite_source`.

**Migration**
- Single migration:
  1. Drop nothing structural; add a `partial unique index on profiles(user_id)` if not already present (schema shows PK exists, so likely a no-op — verify).
  2. Add a `promo_validated` default handling comment (no schema change).
  3. Ensure a `rep`-only INSERT into `user_roles` cannot be escalated: RLS from Security Pass 1 already blocks self-promotion; no change needed here.
  4. Add `GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit` to `authenticated` if not already granted (verify in Security Pass 2 migration first).
  - If none of the above are actually needed after verification, skip the migration entirely.

**Config**
- `supabase/config.toml` — `[functions.create-team-member]` block stays with `verify_jwt = false` (function validates in code, matching project convention).

## 2. Does `auth.admin.inviteUserByEmail` fit?

Yes. It:
- Creates the auth user (or reuses an unconfirmed one) and emails a Supabase-managed invite link.
- Accepts `data` (persisted to `raw_user_meta_data`, readable by `handle_new_user`) and `redirectTo` (must be in the project's Auth "Redirect URLs" allow-list).
- The invite link resolves to `#access_token=…&type=invite` and Supabase's client picks up the session, so our existing `/reset-password` page works with a small `type=invite` branch. Redirect target: `${SITE_URL}/reset-password?flow=invite`. `SITE_URL` should be read from `Deno.env.get("PUBLIC_SITE_URL")` with a fallback to the request `origin` header (validated against an allow-list) — do NOT trust an arbitrary `origin`.

## 3. Interaction with `handle_new_user` and duplicate rows

- `handle_new_user` runs on `auth.users` insert and inserts `profiles(user_id, full_name)` + `user_roles(user_id, 'rep')` with `ON CONFLICT DO NOTHING`. Safe.
- The invite function must:
  - NOT insert into `user_roles` (trigger already did, and RLS blocks anything other than `rep`).
  - Use `UPSERT` on `profiles` keyed by `user_id` to add `team_id`, `aloware_user_id`, `promo_validated = true` on top of the trigger's row — never a plain INSERT (would race the trigger and 23505).
  - If `inviteUserByEmail` succeeds but the profile upsert fails, delete the freshly created auth user only if `last_sign_in_at IS NULL AND created_at > now() - interval '1 minute'` (avoid nuking a real existing user); otherwise return 500 and log for manual cleanup. Never delete users we didn't just create.

## 4. Validation, authz, rate limit, duplicate & error hygiene

- Zod validates every field server-side before any Supabase call.
- Manager check via `has_role` RPC + `team_id` lookup; both must succeed or return `403 { error: "forbidden" }` (no detail).
- All duplicate/permission errors return the same generic shape `{ success: false, code: <opaque> }`. Specifically:
  - `email_unavailable` — used for "belongs to another team" and "already exists on a different account" alike.
  - `already_member` — already on your team (idempotent OK to disclose since manager already sees the roster).
  - `invite_rate_limited` — with `Retry-After` header.
- Rate limit: 5 invites/minute, 50/day per manager (`check_and_increment_rate_limit`). `resend-invite` shares the same bucket keyed by `function_name = 'team-invite'`.
- No email/name/link ever appears in `console.log`. The invite token/link is generated inside GoTrue and never returned to us.

## 5. Resend & already-accepted users

- `resend-invite` is safe when the target's `last_sign_in_at IS NULL` and `email_confirmed_at IS NULL` — Supabase's `inviteUserByEmail` on an unconfirmed user re-sends the invite. Rate-limited as above.
- If the user has ever signed in (`last_sign_in_at IS NOT NULL`), the action returns `{ code: "already_active" }` and the UI tells the manager: "This teammate already has an account. They can reset their password from the sign-in page." No manager-initiated password reset — ever.
- The `/forgot-password` page already exists and calls `resetPasswordForEmail` with `redirectTo: ${origin}/reset-password`; that's the sole path for password recovery.

## 6. Manual Supabase prerequisites (cannot be automated from code)

These must be done in the Supabase dashboard by the project owner — surface as a checklist after deploy:

1. **Auth → URL Configuration → Site URL**: set to production URL (`https://pitchviper.com`).
2. **Auth → URL Configuration → Redirect URLs**: add `https://pitchviper.com/reset-password`, `https://pitchviper.lovable.app/reset-password`, and the preview-branch pattern `https://*.lovable.app/reset-password`. Without this, `redirectTo` is silently rewritten to Site URL.
3. **Auth → Email Templates → Invite user**: replace default copy with PitchViper branding. The link token `{{ .ConfirmationURL }}` MUST be preserved. Subject e.g. "You're invited to PitchViper".
4. **Auth → Providers → Email**: keep "Confirm email" enabled; do NOT toggle "Enable auto-confirm" (would let managers bypass invite emails).
5. **Auth → Rate Limits**: the default GoTrue email cap is low; if manager invites will exceed ~4/hour project-wide, raise via `supabase--configure_auth` `rate_limit_email_sent`. Requires managed email or verified custom sending domain.
6. **SMTP / sender domain**: for production deliverability, verify the sender domain in Auth → SMTP Settings (or use Lovable Emails via `email_domain--setup_email_infra` — separate project, out of scope here).
7. **Invitation link lifetime**: default 24h. Optional to extend under Auth → Email settings.

## 7. Tests & preview verification

**Automated**
- Unit-test the Zod schemas and the "which duplicate branch" decision (mock `auth.admin.listUsers` / `getUserById` results).
- `bunx tsgo --noEmit` and `bun run build` after implementation.

**Manual preview checklist**
1. As manager: submit invite for a fresh email → expect toast "Invitation sent"; roster shows row with `Invited` badge.
2. Open invite email → click link → land on `/reset-password?flow=invite` with an active session; set a password ≥ 8 chars → redirected to `/onboarding`.
3. Onboarding shows Step 2 (Profile) as first visible step — promo skipped, team pre-selected; complete → land on `/app`.
4. Verify DB: `profiles.team_id = manager's team`, `promo_validated = true`, `onboarding_completed = true`, `user_roles.role = 'rep'`, no duplicate rows.
5. Invite the same email again → `already_member` (idempotent, no second email).
6. Invite an email that belongs to another team's rep → generic `email_unavailable`; no info leak in the network response.
7. Resend for an `Invited` user → new email arrives; for an `Active` user → button disabled, tooltip points to self-serve reset.
8. Fire 6 invites in <60s → 6th returns `invite_rate_limited` with `Retry-After`.
9. Attempt any `reset-password` action from browser devtools → 400 `Invalid action`.
10. Confirm nowhere in the UI or network responses is any password visible; grep the built bundle for `generatePassword` returns nothing.

## Out of scope

- Migrating existing manager-set-password accounts (they keep their current password; if forgotten, use `/forgot-password`).
- Bulk CSV invites, invite expiry customization, custom SMTP setup, and any changes to non-invitation admin actions.
