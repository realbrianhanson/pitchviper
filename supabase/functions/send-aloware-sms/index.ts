import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticatePost, corsHeaders, errorResponse, isUuid, jsonResponse } from "../_shared/edgeAuth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { boundedText, logAlowareEvent, normalizePhone, readBoundedJson } from "../_shared/alowareSafe.ts";

const MAX_SMS_LENGTH = 1600;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authenticatePost(req);
  if (!auth.ok) return auth.response;
  const { userId, serviceClient } = auth.ctx;

  const alowareToken = Deno.env.get("ALOWARE_API_TOKEN");
  if (!alowareToken) return errorResponse("provider_unconfigured", 503, { success: false });

  const limit = await enforceRateLimit(userId, "send-aloware-sms", { perMinute: 20, perDay: 500, serviceClient });
  if (!limit.allowed) return limit.response;

  const body = (await readBoundedJson(req, 16384)) as Record<string, unknown> | null;
  if (!body) return errorResponse("invalid_body", 400, { success: false });

  const phoneNumber = normalizePhone(body.phoneNumber);
  const message = boundedText(body.message, MAX_SMS_LENGTH);
  if (!phoneNumber) return errorResponse("invalid_phone", 400, { success: false });
  if (!message) return errorResponse("invalid_message", 400, { success: false });

  const contactName = boundedText(body.contactName, 120);
  const dealId = typeof body.dealId === "string" && isUuid(body.dealId) ? body.dealId : null;

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("aloware_user_id, team_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile?.aloware_user_id) return errorResponse("aloware_not_linked", 400, { success: false });

  let providerData: Record<string, unknown> = {};
  try {
    const resp = await fetch("https://app.aloware.com/api/v1/webhook/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_token: alowareToken,
        user_id: profile.aloware_user_id,
        to: phoneNumber,
        message,
      }),
    });
    if (!resp.ok) {
      await logAlowareEvent(serviceClient, {
        event_type: "sms_send_failed",
        team_id: profile.team_id,
        processed: false,
        error_code: "provider_error",
        counters: { status: resp.status },
      });
      return errorResponse("provider_error", 502, { success: false });
    }
    providerData = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
  } catch {
    return errorResponse("provider_unreachable", 502, { success: false });
  }

  const alowareMessageId = providerData.id ?? providerData.message_id ?? null;
  const { data: smsRecord } = await serviceClient
    .from("sms_messages")
    .insert({
      user_id: userId,
      team_id: profile.team_id,
      deal_id: dealId,
      contact_phone: phoneNumber,
      contact_name: contactName,
      message,
      direction: "outbound",
      aloware_message_id: alowareMessageId ? String(alowareMessageId) : null,
      status: "sent",
    })
    .select("id")
    .maybeSingle();

  await logAlowareEvent(serviceClient, {
    event_type: "sms_sent",
    team_id: profile.team_id,
    processed: true,
    counters: { has_message_id: alowareMessageId ? 1 : 0 },
  });

  return jsonResponse({
    success: true,
    messageId: smsRecord?.id ?? null,
    alowareMessageId: alowareMessageId ?? null,
  });
});
