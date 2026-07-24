import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticatePost, corsHeaders, errorResponse, jsonResponse } from "../_shared/edgeAuth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { boundedText, logAlowareEvent, normalizePhone, readBoundedJson, safeEmail } from "../_shared/alowareSafe.ts";
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

  const limit = await enforceRateLimit(userId, "lookup-aloware-contact", { perMinute: 30, perDay: 1000, serviceClient });
  if (!limit.allowed) return limit.response;

  const body = (await readBoundedJson(req, 8192)) as Record<string, unknown> | null;
  if (!body) return errorResponse("invalid_body", 400, { success: false });

  const action = boundedText(body.action, 20) ?? "lookup";
  const { data: profile } = await serviceClient
    .from("profiles").select("team_id").eq("user_id", userId).maybeSingle();
  const alowareToken = await getTeamAlowareToken(serviceClient, profile?.team_id ?? null);
  if (!alowareToken) return errorResponse("integration_not_configured", 400, { success: false });


  if (action === "lookup") {
    const phoneNumber = body.phoneNumber != null && body.phoneNumber !== "" ? normalizePhone(body.phoneNumber) : null;
    const email = body.email != null && body.email !== "" ? safeEmail(body.email) : null;
    const name = boundedText(body.name, 120);
    if (!phoneNumber && !email && !name) return errorResponse("query_required", 400, { success: false });

    const url = new URL("https://app.aloware.com/api/v1/webhook/contacts");
    url.searchParams.append("api_token", alowareToken);
    if (phoneNumber) url.searchParams.append("phone_number", phoneNumber);
    if (email) url.searchParams.append("email", email);
    if (name) url.searchParams.append("search", name);

    let contacts: unknown[] = [];
    try {
      const resp = await fetch(url.toString(), { method: "GET", headers: { Accept: "application/json" } });
      const text = await resp.text();
      if (!resp.ok || text.startsWith("<")) return errorResponse("provider_error", 502, { success: false });
      const parsed = JSON.parse(text) as { data?: unknown[] } | unknown[];
      const raw = Array.isArray(parsed) ? parsed : Array.isArray(parsed.data) ? parsed.data : [];
      contacts = raw.slice(0, 100);
    } catch {
      return errorResponse("provider_unreachable", 502, { success: false });
    }

    const formatted = (contacts as Record<string, unknown>[]).map((c) => ({
      id: c.id,
      firstName: c.first_name ?? c.firstName,
      lastName: c.last_name ?? c.lastName,
      fullName: c.name ?? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
      email: c.email,
      phone: c.phone_number ?? c.phone,
      company: c.company_name ?? c.company,
      title: c.title ?? c.job_title,
      tags: c.tags ?? [],
      createdAt: c.created_at,
      lastContactedAt: c.last_contacted_at,
      alowareId: c.id,
    }));

    await logAlowareEvent(serviceClient, {
      event_type: "contact_lookup",
      team_id: profile?.team_id ?? null,
      counters: { results: formatted.length },
    });
    return jsonResponse({ success: true, contacts: formatted, count: formatted.length });
  }

  if (action === "get-details") {
    const contactId = boundedText(body.contactId, 64);
    if (!contactId) return errorResponse("invalid_contact_id", 400, { success: false });
    try {
      const url = new URL(`https://app.aloware.com/api/v1/webhook/contacts/${encodeURIComponent(contactId)}`);
      url.searchParams.append("api_token", alowareToken);
      const resp = await fetch(url.toString(), { method: "GET", headers: { Accept: "application/json" } });
      if (!resp.ok) return errorResponse("contact_not_found", 404, { success: false });
      const c = (await resp.json()) as Record<string, unknown>;
      return jsonResponse({
        success: true,
        contact: {
          id: c.id,
          firstName: c.first_name,
          lastName: c.last_name,
          fullName: c.name ?? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
          email: c.email,
          phone: c.phone_number ?? c.phone,
          company: c.company_name ?? c.company,
          title: c.title ?? c.job_title,
          address: c.address,
          city: c.city,
          state: c.state,
          tags: c.tags ?? [],
          notes: c.notes,
          customFields: c.custom_fields ?? {},
          createdAt: c.created_at,
          lastContactedAt: c.last_contacted_at,
          callHistory: c.calls ?? [],
          alowareId: c.id,
        },
      });
    } catch {
      return errorResponse("provider_unreachable", 502, { success: false });
    }
  }

  return errorResponse("invalid_action", 400, { success: false });
});
