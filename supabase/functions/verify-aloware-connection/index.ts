import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticatePost, corsHeaders, errorResponse, isUuid, jsonResponse } from "../_shared/edgeAuth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { boundedText, logAlowareEvent, readBoundedJson } from "../_shared/alowareSafe.ts";

async function fetchAlowareUsers(alowareToken: string): Promise<unknown[] | null> {
  try {
    const url = new URL("https://app.aloware.com/api/v1/webhook/users");
    url.searchParams.append("api_token", alowareToken);
    const resp = await fetch(url.toString(), { method: "GET", headers: { Accept: "application/json" } });
    const text = await resp.text();
    if (!resp.ok || text.startsWith("<")) return null;
    const parsed = JSON.parse(text) as { data?: unknown[] } | unknown[];
    return Array.isArray(parsed) ? parsed : Array.isArray(parsed.data) ? parsed.data : [];
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authenticatePost(req);
  if (!auth.ok) return auth.response;
  const { userId, serviceClient } = auth.ctx;

  const alowareToken = Deno.env.get("ALOWARE_API_TOKEN");
  if (!alowareToken) return errorResponse("provider_unconfigured", 503, { success: false });

  const limit = await enforceRateLimit(userId, "verify-aloware-connection", { perMinute: 20, perDay: 200, serviceClient });
  if (!limit.allowed) return limit.response;

  const body = (await readBoundedJson(req, 8192)) as Record<string, unknown> | null;
  if (!body) return errorResponse("invalid_body", 400, { success: false });
  const action = boundedText(body.action, 24);
  if (!action) return errorResponse("invalid_action", 400, { success: false });

  const { data: callerProfile } = await serviceClient
    .from("profiles").select("team_id").eq("user_id", userId).maybeSingle();
  const teamId = callerProfile?.team_id ?? null;

  const requireMgmt = async () => {
    const { data: isMgmt } = await serviceClient.rpc("has_management_role", { _user_id: userId });
    return isMgmt === true;
  };

  if (action === "get-status") {
    const { data: profile } = await serviceClient
      .from("profiles").select("aloware_user_id").eq("user_id", userId).maybeSingle();
    const { data: lastSync } = await serviceClient
      .from("aloware_sync_log")
      .select("created_at")
      .eq("team_id", teamId)
      .eq("processed", true)
      .order("created_at", { ascending: false })
      .limit(1);
    return jsonResponse({
      success: true,
      connected: !!profile?.aloware_user_id,
      alowareUserId: profile?.aloware_user_id ?? null,
      lastSyncAt: lastSync?.[0]?.created_at ?? null,
    });
  }

  if (action === "verify") {
    const users = await fetchAlowareUsers(alowareToken);
    if (!users) return errorResponse("provider_error", 502, { success: false });
    if (teamId && (await requireMgmt())) {
      const nowIso = new Date().toISOString();
      const { data: existing } = await serviceClient
        .from("company_settings").select("id, crm_connected_at").eq("team_id", teamId).maybeSingle();
      if (existing?.id) {
        await serviceClient.from("company_settings").update({
          crm_provider: "aloware",
          crm_connected_at: existing.crm_connected_at ?? nowIso,
        }).eq("id", existing.id);
      } else {
        await serviceClient.from("company_settings").insert({
          team_id: teamId, crm_provider: "aloware", crm_connected_at: nowIso,
        });
      }
    }
    await logAlowareEvent(serviceClient, {
      event_type: "verify",
      team_id: teamId,
      counters: { users: users.length },
    });
    return jsonResponse({ success: true, users, message: "Successfully connected to Aloware" });
  }

  if (action === "link-user") {
    const alowareUserId = boundedText(body.alowareUserId, 64);
    if (!alowareUserId) return errorResponse("invalid_aloware_user_id", 400, { success: false });
    const { error } = await serviceClient
      .from("profiles").update({ aloware_user_id: alowareUserId }).eq("user_id", userId);
    if (error) return errorResponse("link_failed", 500, { success: false });
    return jsonResponse({ success: true, message: "Successfully linked Aloware user" });
  }

  if (action === "sync-team") {
    if (!(await requireMgmt())) return errorResponse("forbidden", 403, { success: false });
    if (!teamId) return errorResponse("no_team", 403, { success: false });
    const users = await fetchAlowareUsers(alowareToken);
    if (!users) return errorResponse("provider_error", 502, { success: false });
    const { data: profiles } = await serviceClient
      .from("profiles").select("id, user_id, full_name, aloware_user_id").eq("team_id", teamId);
    const matchResults = (profiles ?? []).map((p) => {
      const match = (users as Record<string, unknown>[]).find((au) =>
        (typeof au.name === "string" && au.name.toLowerCase() === (p.full_name ?? "").toLowerCase()) ||
        (typeof au.email === "string" && au.email.toLowerCase() === (p.full_name ?? "").toLowerCase())
      ) ?? null;
      return {
        profileId: p.id,
        profileName: p.full_name,
        currentAlowareId: p.aloware_user_id,
        suggestedAlowareUser: match,
      };
    });
    await logAlowareEvent(serviceClient, {
      event_type: "team_sync",
      team_id: teamId,
      counters: {
        aloware_users: users.length,
        profiles: profiles?.length ?? 0,
        matches: matchResults.filter((m) => m.suggestedAlowareUser).length,
      },
    });
    return jsonResponse({
      success: true,
      alowareUsers: users,
      matchResults,
      message: `Found ${users.length} Aloware users`,
    });
  }

  if (action === "map-user") {
    if (!(await requireMgmt())) return errorResponse("forbidden", 403, { success: false });
    const profileId = boundedText(body.profileId, 64);
    const alowareUserId = boundedText(body.alowareUserId, 64);
    if (!profileId || !isUuid(profileId) || !alowareUserId) {
      return errorResponse("invalid_args", 400, { success: false });
    }
    const { data: targetProfile } = await serviceClient
      .from("profiles").select("team_id").eq("id", profileId).maybeSingle();
    if (!teamId || teamId !== targetProfile?.team_id) return errorResponse("forbidden", 403, { success: false });
    const { error } = await serviceClient
      .from("profiles").update({ aloware_user_id: alowareUserId }).eq("id", profileId);
    if (error) return errorResponse("map_failed", 500, { success: false });
    return jsonResponse({ success: true, message: "User mapped successfully" });
  }

  return errorResponse("invalid_action", 400, { success: false });
});
