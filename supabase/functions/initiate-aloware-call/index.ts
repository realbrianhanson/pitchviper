import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticatePost, corsHeaders, errorResponse, jsonResponse } from "../_shared/edgeAuth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { boundedText, isSafePhone, logAlowareEvent, normalizePhone, readBoundedJson } from "../_shared/alowareSafe.ts";
import { getTeamAlowareToken } from "../_shared/alowareIntegration.ts";
import { requireTeamEntitlement } from "../_shared/entitlement.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authenticatePost(req);
  if (!auth.ok) return auth.response;
  const { userId, serviceClient } = auth.ctx;

  const _ent = await requireTeamEntitlement(serviceClient, userId, "starter");
  if (!_ent.ok) return _ent.response;
  // Per-team Aloware token resolved lazily after profile.team_id lookup.

  const limit = await enforceRateLimit(userId, "initiate-aloware-call", { perMinute: 20, perDay: 500, serviceClient });
  if (!limit.allowed) return limit.response;

  const body = (await readBoundedJson(req, 8192)) as Record<string, unknown> | null;
  if (!body) return errorResponse("invalid_body", 400, { success: false });

  const contactPhoneNumber = normalizePhone(body.contactPhoneNumber);
  if (!contactPhoneNumber) return errorResponse("invalid_phone", 400, { success: false });
  const linePhoneNumberRaw = body.linePhoneNumber;
  const linePhoneNumber = linePhoneNumberRaw == null || linePhoneNumberRaw === ""
    ? null
    : normalizePhone(linePhoneNumberRaw);
  if (linePhoneNumberRaw != null && linePhoneNumberRaw !== "" && !linePhoneNumber) {
    return errorResponse("invalid_line", 400, { success: false });
  }
  const contactName = boundedText(body.contactName, 120);
  const companyName = boundedText(body.companyName, 120);

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("aloware_user_id, team_id, default_aloware_line")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile?.aloware_user_id) return errorResponse("aloware_not_linked", 400, { success: false });
  const alowareToken = await getTeamAlowareToken(serviceClient, profile.team_id);
  if (!alowareToken) return errorResponse("integration_not_configured", 400, { success: false });


  const effectiveLine = linePhoneNumber || (isSafePhone(profile.default_aloware_line) ? normalizePhone(profile.default_aloware_line) : null);
  if (!effectiveLine) return errorResponse("no_outbound_line", 400, { success: false });

  let providerResult: Record<string, unknown> = {};
  try {
    const resp = await fetch("https://app.aloware.com/api/v1/webhook/two-legged-call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_token: alowareToken,
        user_id: profile.aloware_user_id,
        contact_phone_number: contactPhoneNumber,
        line_phone_number: effectiveLine,
      }),
    });
    if (!resp.ok) {
      await logAlowareEvent(serviceClient, {
        event_type: "call_initiation_failed",
        team_id: profile.team_id,
        processed: false,
        error_code: "provider_error",
        counters: { status: resp.status },
      });
      return errorResponse("provider_error", 502, { success: false });
    }
    providerResult = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
  } catch {
    return errorResponse("provider_unreachable", 502, { success: false });
  }

  await serviceClient.rpc("update_user_status", {
    p_user_id: userId,
    p_status: "on_call",
    p_call_started_at: new Date().toISOString(),
  });

  const alowareCallId = providerResult.call_id ?? providerResult.id ?? null;
  const { data: callRecord } = await serviceClient
    .from("calls")
    .insert({
      user_id: userId,
      team_id: profile.team_id,
      contact_name: contactName ?? "Unknown",
      company_name: companyName,
      phone_number: contactPhoneNumber,
      direction: "outbound",
      outcome: "connected",
      duration_seconds: 0,
      aloware_call_id: alowareCallId ? String(alowareCallId) : null,
      is_synced_from_aloware: false,
    })
    .select("id")
    .maybeSingle();

  await logAlowareEvent(serviceClient, {
    event_type: "call_initiated",
    team_id: profile.team_id,
    processed: true,
    counters: { created_call: callRecord ? 1 : 0 },
  });

  return jsonResponse({
    success: true,
    message: "Call initiated successfully",
    callId: callRecord?.id ?? null,
    alowareCallId: alowareCallId ?? null,
  });
});
