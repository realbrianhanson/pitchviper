import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticatePost, corsHeaders, errorResponse, jsonResponse } from "../_shared/edgeAuth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { boundedText, logAlowareEvent, normalizePhone, readBoundedJson, safeEmail } from "../_shared/alowareSafe.ts";
import { getTeamAlowareToken } from "../_shared/alowareIntegration.ts";
import { requireTeamEntitlement } from "../_shared/entitlement.ts";

const MAX_CONTACTS = 100;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authenticatePost(req);
  if (!auth.ok) return auth.response;
  const { userId, serviceClient } = auth.ctx;

  const _ent = await requireTeamEntitlement(serviceClient, userId, "starter");
  if (!_ent.ok) return _ent.response;
  // Per-team Aloware token resolved lazily after profile.team_id lookup.

  const limit = await enforceRateLimit(userId, "add-to-aloware-powerdialer", { perMinute: 10, perDay: 200, serviceClient });
  if (!limit.allowed) return limit.response;

  const body = (await readBoundedJson(req, 65536)) as Record<string, unknown> | null;
  if (!body) return errorResponse("invalid_body", 400, { success: false });

  const rawContacts = Array.isArray(body.contacts) ? body.contacts : null;
  if (!rawContacts || rawContacts.length === 0) return errorResponse("no_contacts", 400, { success: false });
  if (rawContacts.length > MAX_CONTACTS) return errorResponse("too_many_contacts", 400, { success: false });
  const position = body.position === "top" ? "top" : "bottom";

  const contacts = rawContacts
    .map((raw) => {
      const c = raw as Record<string, unknown>;
      const phone = normalizePhone(c.phoneNumber);
      if (!phone) return null;
      return {
        phoneNumber: phone,
        name: boundedText(c.name, 120) ?? "Unknown",
        companyName: boundedText(c.companyName, 120),
        email: safeEmail(c.email),
      };
    })
    .filter((c): c is NonNullable<typeof c> => !!c);

  if (contacts.length === 0) return errorResponse("no_valid_contacts", 400, { success: false });

  const { data: profile } = await serviceClient
    .from("profiles").select("aloware_user_id, team_id").eq("user_id", userId).maybeSingle();
  if (!profile?.aloware_user_id) return errorResponse("aloware_not_linked", 400, { success: false });

  const added: Array<{ phoneNumber: string; name: string; success: true; alowareContactId?: unknown }> = [];
  const failed: Array<{ phoneNumber: string; name: string; error: string }> = [];

  for (const c of contacts) {
    try {
      const resp = await fetch("https://app.aloware.com/api/v1/contacts", {
        method: "POST",
        headers: { Authorization: `Bearer ${alowareToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          api_token: alowareToken,
          phone_number: c.phoneNumber,
          name: c.name,
          company_name: c.companyName ?? undefined,
          email: c.email ?? undefined,
          add_to_powerdialer: true,
          powerdialer_position: position,
          user_id: profile.aloware_user_id,
        }),
      });
      const result = await resp.json().catch(() => ({}));
      if (resp.ok) added.push({ phoneNumber: c.phoneNumber, name: c.name, success: true, alowareContactId: (result as { id?: unknown }).id });
      else failed.push({ phoneNumber: c.phoneNumber, name: c.name, error: "provider_error" });
    } catch {
      failed.push({ phoneNumber: c.phoneNumber, name: c.name, error: "network_error" });
    }
  }

  await logAlowareEvent(serviceClient, {
    event_type: "powerdialer_add",
    team_id: profile.team_id,
    processed: true,
    counters: { added: added.length, failed: failed.length },
  });

  return jsonResponse({
    success: true,
    message: `Added ${added.length} contact(s) to power dialer`,
    added,
    failed,
  });
});
