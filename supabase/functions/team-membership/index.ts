// Authenticated, rate-limited team join/create.
// Delegates the actual DB mutation to two service-only SECURITY DEFINER
// functions (svc_join_team_by_code / svc_create_team) that run atomically
// inside one transaction with SELECT ... FOR UPDATE on the caller profile.
// The client never sees raw provider objects — errors are stable snake_case
// codes and no raw values, exception text, or team names are logged.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const CODE_RE = /^[A-Z0-9]{6,10}$/;

// Map of internal Postgres exception messages → stable public error codes.
// Anything not on this list becomes "server_error" so we never leak details.
const KNOWN_ERRORS = new Set([
  "invalid_user",
  "invalid_code",
  "invalid_name",
  "already_on_team",
  "profile_not_found",
  "team_not_found",
  "join_failed",
  "code_allocation_failed",
]);

function structuredResult(data: unknown):
  | { team_id: string; team_name: string; team_code: string }
  | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (
    typeof d.team_id !== "string" ||
    typeof d.team_name !== "string" ||
    typeof d.team_code !== "string"
  ) {
    return null;
  }
  return { team_id: d.team_id, team_name: d.team_name, team_code: d.team_code };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "unauthorized" });
    const token = authHeader.slice("Bearer ".length);

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: authData, error: authError } = await anon.auth.getUser(token);
    if (authError || !authData.user) return json(401, { error: "unauthorized" });
    const userId = authData.user.id;

    const rl = await enforceRateLimit(userId, "team-membership", {
      perMinute: 5,
      perDay: 30,
    });
    if (!rl.allowed && rl.response) return rl.response;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "invalid_body" });
    }
    const action = body?.action;
    if (action !== "join" && action !== "create") {
      return json(400, { error: "invalid_action" });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (action === "join") {
      const raw =
        typeof body.teamCode === "string" ? body.teamCode.trim().toUpperCase() : "";
      if (!CODE_RE.test(raw)) return json(400, { error: "invalid_code" });

      const { data, error } = await service.rpc("svc_join_team_by_code", {
        _user_id: userId,
        _code: raw,
      });
      if (error) {
        const code = KNOWN_ERRORS.has(error.message) ? error.message : "server_error";
        console.error("[team-membership] join failed:", code);
        const status =
          code === "already_on_team"
            ? 409
            : code === "team_not_found"
            ? 404
            : code === "invalid_code" || code === "invalid_user"
            ? 400
            : 500;
        return json(status, { error: code });
      }
      const result = structuredResult(data);
      if (!result) {
        console.error("[team-membership] join: invalid rpc result shape");
        return json(500, { error: "server_error" });
      }
      return json(200, result);
    }

    // action === "create"
    const rawName = typeof body.name === "string" ? body.name : "";
    const { data, error } = await service.rpc("svc_create_team", {
      _user_id: userId,
      _name: rawName,
    });
    if (error) {
      const code = KNOWN_ERRORS.has(error.message) ? error.message : "server_error";
      console.error("[team-membership] create failed:", code);
      const status =
        code === "already_on_team"
          ? 409
          : code === "invalid_name" || code === "invalid_user"
          ? 400
          : 500;
      return json(status, { error: code });
    }
    const result = structuredResult(data);
    if (!result) {
      console.error("[team-membership] create: invalid rpc result shape");
      return json(500, { error: "server_error" });
    }
    return json(200, result);
  } catch {
    console.error("[team-membership] unexpected exception");
    return json(500, { error: "server_error" });
  }
});
