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

// Explicit allowlist of redirect hosts. NO wildcard on .lovable.app — any
// other Lovable project would otherwise be a valid invite redirect target.
const ALLOWED_REDIRECT_HOSTS = new Set([
  "pitchviper.lovable.app",
  "id-preview--a2c3dff5-c4c0-45d6-9507-8f53e2efa38f.lovable.app",
  "localhost",
]);

function resolveRedirectBase(req: Request): string {
  const configured = Deno.env.get("PUBLIC_SITE_URL");
  if (configured) return configured.replace(/\/+$/, "");
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const u = new URL(origin);
      if (ALLOWED_REDIRECT_HOSTS.has(u.hostname)) {
        return u.origin;
      }
    } catch {
      /* ignore */
    }
  }
  return "https://pitchviper.lovable.app";
}


// True if the auth user has already established credentials — either signed in
// or confirmed their email. Either signal means we can't safely re-invite.
function isAuthUserActive(u: { last_sign_in_at?: string | null; email_confirmed_at?: string | null }) {
  return Boolean(u.last_sign_in_at) || Boolean(u.email_confirmed_at);
}

// Ensure the given user's ONLY role is exactly 'rep'.
// Returns:
//   "ok"       — role is rep (already or newly inserted)
//   "wrong"    — user has some non-rep role; caller must refuse and not touch it
//   "error"    — DB failure; caller must refuse
async function ensureRepRole(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<"ok" | "wrong" | "error"> {
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) return "error";
  if (!roles || roles.length === 0) {
    const { error: insErr } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "rep" });
    if (insErr) return "error";
    return "ok";
  }
  const nonRep = roles.some((r: { role: string }) => r.role !== "rep");
  if (nonRep) return "wrong";
  return "ok";
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

    // Management role check (owner / admin / manager) via has_management_role RPC
    const { data: isMgmt } = await supabase.rpc("has_management_role", {
      _user_id: manager.id,
    });
    if (!isMgmt) return json({ success: false, error: "forbidden" }, 403);

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
          // Server treats either signal as "active/not resendable" — the
          // list status must match so the UI never offers resend for a user
          // the server will reject with already_active.
          const status = lastSignInAt || emailConfirmedAt ? "active" : "invited";
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
      const { data: authLookup, error: lookupErr } = await supabase.auth.admin.getUserById(body.userId);
      if (lookupErr) {
        console.log(JSON.stringify({ managerId: manager.id, action: "resend-invite", status: "lookup_failed" }));
        return json({ success: false, code: "invite_failed" }, 500);
      }
      const authUser = authLookup?.user;
      if (!authUser?.email) return json({ success: false, code: "not_found" }, 404);
      if (isAuthUserActive(authUser)) {
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

    // Deterministic per-(team,email) target hash for the reservation.
    const hashBuf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${teamId}:${email}`),
    );
    const targetHash = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Atomic entitlement + seat reservation. Existing live reservation for the
    // same email is reused (safe for re-invites).
    const { data: reserveData, error: reserveErr } = await supabase.rpc("svc_reserve_seat", {
      p_team_id: teamId,
      p_target_hash: targetHash,
      p_requested_by: manager.id,
    });
    if (reserveErr) return json({ success: false, code: "server_error" }, 500);
    const reservation = (reserveData ?? {}) as Record<string, unknown>;
    if (reservation.ok !== true) {
      const code = String(reservation.code ?? "subscription_required");
      const status = code === "seat_limit_reached" ? 409 : 402;
      return json({ success: false, code }, status);
    }
    const reservationId = String(reservation.reservation_id ?? "");
    if (!reservationId) return json({ success: false, code: "server_error" }, 500);

    let consumed = false;
    const release = async () => {
      if (consumed) return;
      await supabase
        .rpc("svc_release_reservation", { p_reservation_id: reservationId })
        .catch(() => {});
    };
    // Atomic finalize: only marks consumed=true when the RPC returns data===true
    // and no error. On any failure it explicitly releases the reservation (the
    // service-only release RPC removes the named reservation whether it was
    // unconsumed or partially consumed) and returns a stable invite_failed.
    const finalizeReservation = async (): Promise<Response | null> => {
      const { data, error } = await supabase.rpc("svc_consume_reservation", {
        p_reservation_id: reservationId,
      });
      if (!error && data === true) {
        consumed = true;
        return null;
      }
      // Best-effort cleanup; ignore any errors from the delete itself.
      await supabase
        .rpc("svc_release_reservation", { p_reservation_id: reservationId })
        .catch(() => {});
      console.log(
        JSON.stringify({
          managerId: manager.id,
          action: "invite",
          status: "reservation_finalize_failed",
        }),
      );
      return json({ success: false, code: "invite_failed" }, 500);
    };

    try {
      // Look up existing auth user by email (paginated scan capped for safety).
      let existingUser:
        | { id: string; email?: string | null; last_sign_in_at?: string | null; email_confirmed_at?: string | null }
        | null = null;
      for (let page = 1; page <= 20; page++) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
        if (error) {
          console.log(JSON.stringify({ managerId: manager.id, action: "invite", status: "list_users_failed" }));
          return json({ success: false, code: "invite_failed" }, 500);
        }
        const match = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
        if (match) {
          existingUser = {
            id: match.id,
            email: match.email,
            last_sign_in_at: match.last_sign_in_at ?? null,
            email_confirmed_at: match.email_confirmed_at ?? null,
          };
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
          // Already on this team — no seat is needed; drop the reservation.
          console.log(JSON.stringify({ managerId: manager.id, action: "invite", status: "already_member" }));
          return json({ success: true, status: "already_member" });
        }
        if (existingProfile?.team_id && existingProfile.team_id !== teamId) {
          console.log(JSON.stringify({ managerId: manager.id, action: "invite", status: "email_unavailable" }));
          return json({ success: false, code: "email_unavailable" }, 409);
        }
        if (isAuthUserActive(existingUser)) {
          console.log(JSON.stringify({ managerId: manager.id, action: "invite", status: "email_unavailable" }));
          return json({ success: false, code: "email_unavailable" }, 409);
        }

        const roleState = await ensureRepRole(supabase, existingUser.id);
        if (roleState !== "ok") {
          console.log(JSON.stringify({ managerId: manager.id, action: "invite", status: "email_unavailable" }));
          return json({ success: false, code: "email_unavailable" }, 409);
        }

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
        const { error: reInviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
          redirectTo,
          data: { full_name: fullName, invite_source: "team_manager" },
        });
        if (reInviteErr) {
          console.log(JSON.stringify({ managerId: manager.id, action: "invite", status: "resend_failed" }));
          return json({ success: false, code: "invite_failed" }, 500);
        }
        // Profile now consumes a seat — reservation is fulfilled.
        const finalizeErr = await finalizeReservation();
        if (finalizeErr) return finalizeErr;
        console.log(JSON.stringify({ managerId: manager.id, action: "invite", status: "resent" }));
        return json({ success: true, status: "resent" });
      }

      // Fresh invite.
      const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          full_name: fullName,
          invite_source: "team_manager",
        },
      });

      if (inviteErr || !invited?.user) {
        console.log(JSON.stringify({ managerId: manager.id, action: "invite", status: "invite_failed" }));
        return json({ success: false, code: "invite_failed" }, 500);
      }

      const newUserId = invited.user.id;
      const invitedAt = invited.user.created_at ?? new Date().toISOString();
      const cleanupIfFresh = async () => {
        const createdRecently =
          Date.parse(invitedAt) > Date.now() - 60_000 && !invited.user!.last_sign_in_at;
        if (createdRecently) {
          await supabase.auth.admin.deleteUser(newUserId).catch(() => {});
        }
      };

      const roleState = await ensureRepRole(supabase, newUserId);
      if (roleState !== "ok") {
        await cleanupIfFresh();
        console.log(JSON.stringify({ managerId: manager.id, action: "invite", status: "role_guarantee_failed" }));
        return json({ success: false, code: "invite_failed" }, 500);
      }

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
        await cleanupIfFresh();
        console.log(JSON.stringify({ managerId: manager.id, action: "invite", status: "profile_upsert_failed" }));
        return json({ success: false, code: "invite_failed" }, 500);
      }

      await supabase.rpc("svc_consume_reservation", { p_reservation_id: reservationId }).catch(() => {});
      consumed = true;
      console.log(JSON.stringify({ managerId: manager.id, action: "invite", status: "ok" }));
      return json({ success: true, status: "invited" });
    } finally {
      await release();
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.log(JSON.stringify({ action: "error", status: "exception", note: msg.slice(0, 200) }));
    return json({ success: false, error: "internal_error" }, 500);
  }
});
