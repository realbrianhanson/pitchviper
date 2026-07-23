// Secure team invitation edge function.
// Managers submit { fullName, email, alowareUserId? } and the invitee receives
// a Supabase-managed invitation email. Managers never see, set, or reset
// passwords — that flow is fully self-service via /forgot-password.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });

const InviteSchema = z.object({
  action: z.literal("invite"),
  email: z.string().trim().toLowerCase().email().max(254),
  fullName: z.string().trim().min(1).max(120),
  alowareUserId: z.string().trim().max(64).optional().nullable(),
});

const ResendSchema = z.object({
  action: z.literal("resend-invite"),
  userId: z.string().uuid(),
});

const ListSchema = z.object({ action: z.literal("list") });
const AlowareSchema = z.object({ action: z.literal("get-aloware-users") });

const BodySchema = z.union([InviteSchema, ResendSchema, ListSchema, AlowareSchema]);

const ALLOWED_REDIRECT_HOSTS = new Set([
  "pitchviper.com",
  "pitchviper.lovable.app",
]);

function resolveRedirectBase(req: Request): string {
  const configured = Deno.env.get("PUBLIC_SITE_URL");
  if (configured) return configured.replace(/\/+$/, "");
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const u = new URL(origin);
      if (
        ALLOWED_REDIRECT_HOSTS.has(u.hostname) ||
        u.hostname.endsWith(".lovable.app") ||
        u.hostname === "localhost"
      ) {
        return u.origin;
      }
    } catch {
      /* ignore */
    }
  }
  return "https://pitchviper.com";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ success: false, error: "unauthorized" }, 401);
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) return json({ success: false, error: "unauthorized" }, 401);
    const manager = userData.user;

    // Manager role check via has_role RPC
    const { data: isManager } = await supabase.rpc("has_role", {
      _user_id: manager.id,
      _role: "manager",
    });
    if (!isManager) return json({ success: false, error: "forbidden" }, 403);

    const { data: managerProfile } = await supabase
      .from("profiles")
      .select("team_id")
      .eq("user_id", manager.id)
      .maybeSingle();
    if (!managerProfile?.team_id) {
      return json({ success: false, error: "forbidden" }, 403);
    }
    const teamId = managerProfile.team_id;

    // ── Parse body ────────────────────────────────────────────────────────
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return json({ success: false, error: "invalid_body" }, 400);
    }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return json({ success: false, error: "invalid_body" }, 400);
    const body = parsed.data;

    // ── LIST ──────────────────────────────────────────────────────────────
    if (body.action === "list") {
      const { data: members, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, aloware_user_id, created_at, title")
        .eq("team_id", teamId);
      if (error) return json({ success: false, error: "list_failed" }, 500);

      // Enrich with auth status (invited vs active)
      const enriched = await Promise.all(
        (members ?? []).map(async (m) => {
          const { data: u } = await supabase.auth.admin.getUserById(m.user_id);
          const authUser = u?.user;
          const lastSignInAt = authUser?.last_sign_in_at ?? null;
          const emailConfirmedAt = authUser?.email_confirmed_at ?? null;
          const status =
            lastSignInAt ? "active" : emailConfirmedAt ? "confirmed" : "invited";
          return {
            ...m,
            email: authUser?.email ?? null,
            invited_at: authUser?.invited_at ?? null,
            last_sign_in_at: lastSignInAt,
            status,
          };
        }),
      );

      return json({ success: true, members: enriched });
    }

    // ── ALOWARE users (unchanged) ────────────────────────────────────────
    if (body.action === "get-aloware-users") {
      const alowareToken = Deno.env.get("ALOWARE_API_TOKEN");
      if (!alowareToken) return json({ success: true, users: [] });
      const url = new URL("https://app.aloware.com/api/v1/webhook/users");
      url.searchParams.append("api_token", alowareToken);
      try {
        const resp = await fetch(url.toString(), { headers: { Accept: "application/json" } });
        const text = await resp.text();
        if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
          return json({ success: true, users: [] });
        }
        const data = JSON.parse(text);
        return json({ success: true, users: data.data ?? data ?? [] });
      } catch {
        return json({ success: true, users: [] });
      }
    }

    // ── Rate limit (shared bucket for invite + resend) ───────────────────
    const rl = await enforceRateLimit(manager.id, "team-invite", {
      perMinute: 5,
      perDay: 50,
    });
    if (!rl.allowed) {
      return json(
        { success: false, code: "invite_rate_limited" },
        429,
        rl.retryAfterSeconds ? { "Retry-After": String(rl.retryAfterSeconds) } : {},
      );
    }

    const redirectBase = resolveRedirectBase(req);
    const redirectTo = `${redirectBase}/reset-password?flow=invite`;

    // ── RESEND ────────────────────────────────────────────────────────────
    if (body.action === "resend-invite") {
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("user_id", body.userId)
        .maybeSingle();
      if (!targetProfile || targetProfile.team_id !== teamId) {
        return json({ success: false, code: "not_found" }, 404);
      }
      const { data: authLookup } = await supabase.auth.admin.getUserById(body.userId);
      const authUser = authLookup?.user;
      if (!authUser?.email) return json({ success: false, code: "not_found" }, 404);
      if (authUser.last_sign_in_at) {
        return json({ success: false, code: "already_active" }, 409);
      }
      const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
        authUser.email,
        { redirectTo },
      );
      if (inviteErr) {
        console.log(JSON.stringify({ managerId: manager.id, action: "resend-invite", status: "failed" }));
        return json({ success: false, code: "invite_failed" }, 500);
      }
      console.log(JSON.stringify({ managerId: manager.id, action: "resend-invite", status: "ok" }));
      return json({ success: true, status: "resent" });
    }

    // ── INVITE ────────────────────────────────────────────────────────────
    const { email, fullName, alowareUserId } = body;

    // Look up existing auth user by email (paginated scan capped for safety).
    let existingUser: { id: string; email?: string | null; last_sign_in_at?: string | null } | null = null;
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      const match = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (match) {
        existingUser = { id: match.id, email: match.email, last_sign_in_at: match.last_sign_in_at ?? null };
        break;
      }
      if (data.users.length < 200) break;
    }

    if (existingUser) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("user_id", existingUser.id)
        .maybeSingle();

      if (existingProfile?.team_id && existingProfile.team_id === teamId) {
        console.log(JSON.stringify({ managerId: manager.id, action: "invite", status: "already_member" }));
        return json({ success: true, status: "already_member" });
      }
      if (existingProfile?.team_id && existingProfile.team_id !== teamId) {
        console.log(JSON.stringify({ managerId: manager.id, action: "invite", status: "email_unavailable" }));
        return json({ success: false, code: "email_unavailable" }, 409);
      }
      if (existingUser.last_sign_in_at) {
        // Confirmed & signed in before but no profile team — treat as unavailable.
        console.log(JSON.stringify({ managerId: manager.id, action: "invite", status: "email_unavailable" }));
        return json({ success: false, code: "email_unavailable" }, 409);
      }

      // Unconfirmed / never-signed-in user: attach to team and re-send invite.
      const { error: upsertErr } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: existingUser.id,
            full_name: fullName,
            team_id: teamId,
            aloware_user_id: alowareUserId ?? null,
            promo_validated: true,
            onboarding_completed: false,
          },
          { onConflict: "user_id" },
        );
      if (upsertErr) {
        console.log(JSON.stringify({ managerId: manager.id, action: "invite", status: "profile_upsert_failed" }));
        return json({ success: false, code: "invite_failed" }, 500);
      }
      const { error: reInviteErr } = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo });
      if (reInviteErr) {
        console.log(JSON.stringify({ managerId: manager.id, action: "invite", status: "resend_failed" }));
        return json({ success: false, code: "invite_failed" }, 500);
      }
      console.log(JSON.stringify({ managerId: manager.id, action: "invite", status: "resent" }));
      return json({ success: true, status: "resent" });
    }

    // Fresh invite.
    const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        full_name: fullName,
        invited_team_id: teamId,
        invited_role: "rep",
        invite_source: "team_manager",
        invited_by: manager.id,
        aloware_user_id: alowareUserId ?? null,
      },
    });

    if (inviteErr || !invited?.user) {
      console.log(JSON.stringify({ managerId: manager.id, action: "invite", status: "invite_failed" }));
      return json({ success: false, code: "invite_failed" }, 500);
    }

    const newUserId = invited.user.id;
    const invitedAt = invited.user.created_at ?? new Date().toISOString();

    // handle_new_user trigger has inserted a base profile + rep role.
    // Upsert to add team_id / aloware / promo_validated.
    const { error: upsertErr } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: newUserId,
          full_name: fullName,
          team_id: teamId,
          aloware_user_id: alowareUserId ?? null,
          promo_validated: true,
          onboarding_completed: false,
        },
        { onConflict: "user_id" },
      );

    if (upsertErr) {
      // Best-effort cleanup: only delete the auth user if we JUST created it
      // and it has never signed in. Guard against nuking pre-existing users.
      const createdRecently =
        Date.parse(invitedAt) > Date.now() - 60_000 && !invited.user.last_sign_in_at;
      if (createdRecently) {
        await supabase.auth.admin.deleteUser(newUserId).catch(() => {});
      }
      console.log(JSON.stringify({ managerId: manager.id, action: "invite", status: "profile_upsert_failed" }));
      return json({ success: false, code: "invite_failed" }, 500);
    }

    console.log(JSON.stringify({ managerId: manager.id, action: "invite", status: "ok" }));
    return json({ success: true, status: "invited" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.log(JSON.stringify({ action: "error", status: "exception", note: msg.slice(0, 200) }));
    return json({ success: false, error: "internal_error" }, 500);
  }
});
