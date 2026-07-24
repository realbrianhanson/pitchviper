// Secure join-or-create team endpoint.
// - Authenticated only, rate-limited per user.
// - Codes are normalized (uppercase, alphanumeric, 6-10 chars).
// - Uses service role to look up teams (find_team_by_code is server-only) and
//   to attach the caller's profile.team_id atomically.
// - Team creation generates a 10-char code with unique-conflict retry, so the
//   removed direct client execute on generate_team_code isn't needed.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const CODE_RE = /^[A-Z0-9]{6,10}$/;
const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateCode(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < 10; i++) out += CHARSET[bytes[i] % CHARSET.length];
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });
    const token = authHeader.slice("Bearer ".length);

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: authData, error: authError } = await anon.auth.getUser(token);
    if (authError || !authData.user) return json(401, { error: "Unauthorized" });
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
      return json(400, { error: "Invalid JSON body" });
    }
    const action = body?.action;
    if (action !== "join" && action !== "create") {
      return json(400, { error: "Invalid action" });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load caller profile to enforce single-team membership.
    const { data: profile, error: profileError } = await service
      .from("profiles")
      .select("id, team_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (profileError || !profile) return json(500, { error: "Profile lookup failed" });
    if (profile.team_id) {
      return json(409, { error: "You are already on a team" });
    }

    if (action === "join") {
      const raw = typeof body.teamCode === "string" ? body.teamCode.trim().toUpperCase() : "";
      if (!CODE_RE.test(raw)) return json(400, { error: "Invalid team code" });

      const { data: team, error: findError } = await service
        .from("teams")
        .select("id, name, team_code")
        .eq("team_code", raw)
        .maybeSingle();
      if (findError) return json(500, { error: "Team lookup failed" });
      if (!team) return json(404, { error: "Team not found" });

      const { error: attachError } = await service
        .from("profiles")
        .update({ team_id: team.id })
        .eq("user_id", userId)
        .is("team_id", null);
      if (attachError) return json(500, { error: "Could not join team" });

      return json(200, {
        team_id: team.id,
        team_name: team.name,
        team_code: team.team_code,
      });
    }

    // action === "create"
    const rawName = typeof body.name === "string" ? body.name.trim() : "";
    if (rawName.length < 2 || rawName.length > 60) {
      return json(400, { error: "Team name must be 2-60 characters" });
    }

    // Insert with unique-code retry.
    let created: { id: string; name: string; team_code: string } | null = null;
    for (let attempt = 0; attempt < 6 && !created; attempt++) {
      const code = generateCode();
      const { data, error } = await service
        .from("teams")
        .insert({ name: rawName, team_code: code, created_by: userId })
        .select("id, name, team_code")
        .maybeSingle();
      if (!error && data) {
        created = data;
        break;
      }
      // 23505 = unique_violation → retry
      if ((error as any)?.code && (error as any).code !== "23505") {
        console.error("[team-membership] create failed:", error);
        return json(500, { error: "Could not create team" });
      }
    }
    if (!created) return json(500, { error: "Could not allocate team code" });

    // Trigger promote_team_creator_to_manager attaches team_id + manager role.
    return json(200, {
      team_id: created.id,
      team_name: created.name,
      team_code: created.team_code,
    });
  } catch (err) {
    console.error("[team-membership] unexpected:", err);
    return json(500, { error: "Server error" });
  }
});
