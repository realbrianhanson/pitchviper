// GoHighLevel webhook receiver.
// Matches incoming activity to a PitchViper rep by assigned user's email,
// falling back to ghl_user_id. Unmatched events are stored as `unassigned`
// rather than dropped.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Constant-time string equality. SHA-256 both sides so the comparison always
// runs over equal-length buffers regardless of user-controlled input length.
async function timingSafeEqualStrings(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

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
      .select("id, matched_user_id, unassigned, match_method")
      .maybeSingle();

    if (error) throw error;

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
