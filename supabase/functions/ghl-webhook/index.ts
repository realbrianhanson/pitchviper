// GoHighLevel webhook receiver.
// Matches incoming activity to a PitchViper rep by assigned user's email,
// falling back to ghl_user_id. Unmatched events are stored as `unassigned`
// rather than dropped.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { timingSafeEqualStrings } from "../_shared/timingSafe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function pickEmail(p: Record<string, unknown>): string | null {
  const candidates = [
    (p as any).assigned_user_email,
    (p as any).assignedUserEmail,
    (p as any).user?.email,
    (p as any).assignedTo?.email,
    (p as any).assigned_to_email,
    (p as any).owner?.email,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c.trim();
  }
  return null;
}

function pickGhlUserId(p: Record<string, unknown>): string | null {
  const candidates = [
    (p as any).assigned_user_id,
    (p as any).assignedUserId,
    (p as any).user?.id,
    (p as any).assignedTo?.id,
    (p as any).owner?.id,
    (p as any).userId,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c.trim();
    if (typeof c === "number") return String(c);
  }
  return null;
}

function pickEventType(p: Record<string, unknown>): string {
  return (
    (p as any).type ||
    (p as any).event ||
    (p as any).eventType ||
    "ghl.unknown"
  );
}

function pickOccurredAt(p: Record<string, unknown>): string {
  const raw =
    (p as any).occurred_at ||
    (p as any).occurredAt ||
    (p as any).timestamp ||
    (p as any).created_at ||
    (p as any).dateAdded;
  if (typeof raw === "string" || typeof raw === "number") {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Webhook signature verification — FAIL CLOSED. Without the shared secret we
  // cannot verify the sender, and this endpoint writes to the DB with the
  // service role, so unauthenticated calls MUST be rejected.
  const expectedSecret = Deno.env.get("GHL_WEBHOOK_SECRET");
  if (!expectedSecret) {
    console.error("GHL_WEBHOOK_SECRET not configured — rejecting webhook");
    return new Response(
      JSON.stringify({ ok: false, error: "Webhook not configured" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const provided =
    req.headers.get("x-ghl-secret") ||
    req.headers.get("x-webhook-secret") ||
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    "";
  if (!(await timingSafeEqualStrings(provided, expectedSecret))) {
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid signature" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const email = pickEmail(payload);
    const ghlUserId = pickGhlUserId(payload);

    const { data: matchedUserId } = await supabase.rpc("match_ghl_user", {
      _email: email,
      _ghl_user_id: ghlUserId,
    });

    let matchMethod: "email" | "ghl_user_id" | "unmatched" = "unmatched";
    if (matchedUserId) {
      // Re-derive which signal matched (email is preferred).
      if (email) {
        const { data: byEmail } = await supabase.rpc("match_ghl_user", {
          _email: email,
          _ghl_user_id: null,
        });
        matchMethod = byEmail ? "email" : "ghl_user_id";
      } else {
        matchMethod = "ghl_user_id";
      }
    }

    const { data, error } = await supabase
      .from("ghl_activities")
      .insert({
        event_type: pickEventType(payload),
        ghl_user_id: ghlUserId,
        assigned_email: email,
        matched_user_id: matchedUserId ?? null,
        match_method: matchMethod,
        unassigned: !matchedUserId,
        payload,
        occurred_at: pickOccurredAt(payload),
      })
      .select("id, matched_user_id, unassigned, match_method, team_id")
      .maybeSingle();

    if (error) throw error;

    // When we matched a rep to a team, stamp the company_settings integration
    // signals so the setup wizard can honestly reflect a live GHL connection.
    if (data?.team_id) {
      try {
        const nowIso = new Date().toISOString();
        const { data: existing } = await supabase
          .from("company_settings")
          .select("id, crm_connected_at, first_sync_at")
          .eq("team_id", data.team_id)
          .maybeSingle();
        if (existing?.id) {
          await supabase
            .from("company_settings")
            .update({
              crm_provider: "gohighlevel",
              crm_connected_at: existing.crm_connected_at ?? nowIso,
              first_sync_at: existing.first_sync_at ?? nowIso,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("company_settings").insert({
            team_id: data.team_id,
            crm_provider: "gohighlevel",
            crm_connected_at: nowIso,
            first_sync_at: nowIso,
          });
        }
      } catch (stampErr) {
        console.warn("ghl-webhook could not stamp company_settings", stampErr);
      }
    }

    return new Response(JSON.stringify({ ok: true, activity: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ghl-webhook error", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
