import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticatePost, corsHeaders, errorResponse, jsonResponse } from "../_shared/edgeAuth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { boundedText, logAlowareEvent, normalizePhone, readBoundedJson, safeEmail } from "../_shared/alowareSafe.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authenticatePost(req);
  if (!auth.ok) return auth.response;
  const { userId, serviceClient } = auth.ctx;

  const alowareToken = Deno.env.get("ALOWARE_API_TOKEN");
  if (!alowareToken) return errorResponse("provider_unconfigured", 503, { success: false });

  const limit = await enforceRateLimit(userId, "create-aloware-lead", { perMinute: 20, perDay: 500, serviceClient });
  if (!limit.allowed) return limit.response;

  const body = (await readBoundedJson(req, 16384)) as Record<string, unknown> | null;
  if (!body) return errorResponse("invalid_body", 400, { success: false });

  const phone = normalizePhone(body.phone);
  const email = safeEmail(body.email);
  if (!phone && !email) return errorResponse("phone_or_email_required", 400, { success: false });

  let firstName = boundedText(body.firstName, 60);
  let lastName = boundedText(body.lastName, 60);
  const fullName = boundedText(body.fullName, 120);
  if (!firstName && !lastName && fullName) {
    const parts = fullName.split(/\s+/);
    firstName = parts[0] ?? null;
    lastName = parts.slice(1).join(" ") || null;
  }

  const company = boundedText(body.company, 120);
  const title = boundedText(body.title, 120);
  const notes = boundedText(body.notes, 1000);
  const tagsArr = Array.isArray(body.tags)
    ? (body.tags as unknown[]).map((t) => boundedText(t, 40)).filter((t): t is string => !!t).slice(0, 10)
    : [];
  const assignToUser = body.assignToUser === true;

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("aloware_user_id, team_id")
    .eq("user_id", userId)
    .maybeSingle();

  const leadPayload: Record<string, unknown> = {
    api_token: alowareToken,
    first_name: firstName ?? "",
    last_name: lastName ?? "",
  };
  if (email) leadPayload.email = email;
  if (phone) leadPayload.phone_number = phone;
  if (company) leadPayload.company_name = company;
  if (title) leadPayload.title = title;
  if (notes) leadPayload.notes = notes;
  if (tagsArr.length) leadPayload.tags = tagsArr;
  if (assignToUser && profile?.aloware_user_id) leadPayload.user_id = profile.aloware_user_id;

  let alowareContactId: unknown = null;
  try {
    const resp = await fetch("https://app.aloware.com/api/v1/webhook/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(leadPayload),
    });
    const text = await resp.text();
    if (!resp.ok || text.startsWith("<")) {
      await logAlowareEvent(serviceClient, {
        event_type: "lead_create_failed",
        team_id: profile?.team_id ?? null,
        processed: false,
        error_code: "provider_error",
        counters: { status: resp.status },
      });
      return errorResponse("provider_error", 502, { success: false });
    }
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const nested = (parsed.data ?? {}) as Record<string, unknown>;
    alowareContactId = parsed.id ?? nested.id ?? null;
  } catch {
    return errorResponse("provider_unreachable", 502, { success: false });
  }

  await logAlowareEvent(serviceClient, {
    event_type: "lead_created",
    team_id: profile?.team_id ?? null,
    processed: true,
    counters: { has_contact_id: alowareContactId ? 1 : 0 },
  });

  return jsonResponse({
    success: true,
    message: "Lead created in Aloware",
    alowareContactId,
    contact: {
      id: alowareContactId,
      firstName,
      lastName,
      fullName: `${firstName ?? ""} ${lastName ?? ""}`.trim(),
      email,
      phone,
      company,
    },
  });
});
