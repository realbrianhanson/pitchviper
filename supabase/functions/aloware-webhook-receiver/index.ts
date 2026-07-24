// Aloware webhook receiver, per-tenant.
//
// Every request MUST include an opaque `?key=<uuid>` matching a stored
// team_provider_integrations.webhook_key. We resolve that key -> team FIRST,
// then verify the team's Vault-stored webhook secret via timing-safe compare
// against Authorization: Bearer <secret> or X-Aloware-Signature.
//
// There is NO global-secret fallback. All downstream lookups/writes are
// constrained to the resolved team_id — a payload from company A can never
// touch company B's data.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAlowareEvent, readBoundedJson } from "../_shared/alowareSafe.ts";
import { checkTeamEntitlementByTeamId } from "../_shared/entitlement.ts";
import { resolveWebhookKey, verifyWebhookAuth } from "../_shared/alowareIntegration.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-aloware-signature",
};

const DISPOSITION_MAP: Record<string, string> = {
  "Appointment Set": "appointment_set",
  "Callback": "callback_scheduled",
  "Not Interested": "not_interested",
  "Deal Closed": "deal_closed",
  "Left Voicemail": "voicemail",
  "No Answer": "no_answer",
  "Busy": "busy",
  "Wrong Number": "wrong_number",
  "DNC": "dnc",
  "Qualified Lead": "qualified",
  "Follow Up": "follow_up",
};

const OUTCOME_MAP: Record<string, "connected" | "voicemail" | "no_answer" | "wrong_number"> = {
  connected: "connected",
  answered: "connected",
  voicemail: "voicemail",
  no_answer: "no_answer",
  "no-answer": "no_answer",
  busy: "no_answer",
  wrong_number: "wrong_number",
  "wrong-number": "wrong_number",
};

const jsonRes = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ error: "method_not_allowed" }, 405);

  const url = new URL(req.url);
  const webhookKey = url.searchParams.get("key");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const lookup = await resolveWebhookKey(supabase, webhookKey);
  if (!lookup) return jsonRes({ error: "invalid_webhook_key" }, 401);
  if (!lookup.hasWebhookSecret) return jsonRes({ error: "webhook_unconfigured" }, 401);

  if (!(await verifyWebhookAuth(supabase, lookup.teamId, req.headers))) {
    return jsonRes({ error: "invalid_signature" }, 401);
  }

  const payload = (await readBoundedJson(req, 262_144)) as Record<string, unknown> | null;
  if (!payload) return jsonRes({ error: "invalid_body" }, 400);

  const teamId = lookup.teamId;
  const ent = await checkTeamEntitlementByTeamId(supabase, teamId, "starter");
  if (!ent.ok) {
    await logAlowareEvent(supabase, {
      event_type: "webhook_ignored",
      team_id: teamId,
      processed: false,
      error_code: ent.code,
    });
    // Stable accepted response so the provider doesn't retry-storm.
    return jsonRes({ success: true, ignored: true });
  }

  try {
    const rawEventType = String(payload.event_type ?? payload.type ?? payload.event ?? "unknown");
    const eventType = rawEventType.toLowerCase().replace(/\s+/g, "_");

    if (
      eventType.includes("call_disposed") ||
      eventType.includes("communication_disposed") ||
      eventType.includes("call_completed") ||
      eventType.includes("call.completed")
    ) {
      return await handleCallCompleted(supabase, teamId, payload);
    }
    if (eventType.includes("recording_saved")) {
      return await handleRecordingSaved(supabase, teamId, payload);
    }
    if (eventType.includes("transcription_saved") || payload.transcription) {
      return await handleTranscriptionSaved(supabase, teamId, payload);
    }
    if (eventType.includes("call_summarized")) {
      return await handleCallSummarized(supabase, teamId, payload);
    }
    if (eventType.includes("voicemail_saved")) {
      return await handleVoicemailSaved(supabase, teamId, payload);
    }
    if (eventType.includes("appointment_saved")) {
      return await handleAppointmentSaved(supabase, teamId, payload);
    }

    await logAlowareEvent(supabase, {
      event_type: eventType.slice(0, 64),
      team_id: teamId,
      processed: false,
      error_code: "unknown_event",
    });
    return jsonRes({ success: true, message: "Event received" });
  } catch {
    await logAlowareEvent(supabase, {
      event_type: "webhook_error",
      team_id: teamId,
      processed: false,
      error_code: "handler_error",
    });
    return jsonRes({ success: false, error: "processing_failed" }, 500);
  }
});

// deno-lint-ignore no-explicit-any
async function handleCallCompleted(supabase: any, teamId: string, payload: any) {
  const callId = payload.call_id ?? payload.id;
  const alowareUserId = payload.user_id ?? payload.agent_id;
  const contact = payload.contact ?? {};
  const durationSeconds = Number(payload.duration_seconds ?? payload.duration ?? 0) || 0;
  const direction = String(payload.direction ?? "").toLowerCase() === "inbound" ? "inbound" : "outbound";
  const dispositionRaw = String(payload.disposition ?? payload.status ?? "");
  const recordingUrl = payload.recording_url ?? payload.recording ?? null;
  const timestamp = payload.timestamp ?? payload.created_at ?? new Date().toISOString();

  // Constrain profile lookup to the resolved team so payloads cannot map to
  // reps in another company even if their aloware_user_id collides.
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, team_id, full_name")
    .eq("team_id", teamId)
    .eq("aloware_user_id", String(alowareUserId))
    .maybeSingle();

  if (!profile) {
    await logAlowareEvent(supabase, {
      event_type: "call_unmatched",
      team_id: teamId,
      processed: false,
      error_code: "no_matching_user",
    });
    return jsonRes({ success: false, error: "user_not_found" }, 200);
  }

  const disposition = DISPOSITION_MAP[dispositionRaw] ?? (dispositionRaw ? dispositionRaw.toLowerCase().replace(/\s+/g, "_") : null);
  const outcomeRaw = String(payload.outcome ?? payload.call_status ?? "connected").toLowerCase();
  const outcome = OUTCOME_MAP[outcomeRaw] ?? "connected";

  const { data: existingCall } = await supabase
    .from("calls")
    .select("id, team_id")
    .eq("aloware_call_id", String(callId))
    .maybeSingle();

  // If a prior sync attached the call to a different team, refuse to update it.
  if (existingCall && existingCall.team_id && existingCall.team_id !== teamId) {
    await logAlowareEvent(supabase, {
      event_type: "call_cross_team_blocked",
      team_id: teamId,
      processed: false,
      error_code: "cross_team_call_id",
    });
    return jsonRes({ success: false, error: "cross_team_call_id" }, 200);
  }

  let callRecord;
  if (existingCall) {
    const { data, error } = await supabase
      .from("calls")
      .update({
        duration_seconds: durationSeconds,
        disposition,
        outcome,
        aloware_recording_url: recordingUrl,
        is_synced_from_aloware: true,
      })
      .eq("id", existingCall.id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    callRecord = data;
  } else {
    const { data, error } = await supabase
      .from("calls")
      .insert({
        user_id: profile.user_id,
        team_id: teamId,
        contact_name: contact.name ?? "Unknown",
        company_name: contact.company ?? null,
        phone_number: contact.phone_number ?? contact.phone ?? null,
        direction,
        outcome,
        disposition,
        duration_seconds: durationSeconds,
        aloware_call_id: String(callId),
        aloware_recording_url: recordingUrl,
        is_synced_from_aloware: true,
        created_at: timestamp,
      })
      .select("id")
      .maybeSingle();
    if (error) throw error;
    callRecord = data;
  }

  await supabase.rpc("log_activity", {
    p_user_id: profile.user_id,
    p_activity_type: direction === "outbound" ? "call_made" : "call_received",
    p_metadata: {
      call_id: callRecord?.id,
      duration_minutes: Math.ceil(durationSeconds / 60),
      disposition,
      synced_from_aloware: true,
    },
  });

  if (disposition === "appointment_set") {
    await supabase.from("notifications").insert({
      user_id: profile.user_id,
      type: "followup_due",
      title: "Appointment Scheduled",
      body: "An appointment was set from an Aloware call. Add it to your calendar.",
      action_url: "/pipeline",
    });
  }
  if (disposition === "deal_closed") {
    await supabase.from("notifications").insert({
      user_id: profile.user_id,
      type: "deal_closed",
      title: "Log Your Deal! 🎉",
      body: "Great work! Don't forget to log the deal in your pipeline.",
      action_url: "/pipeline",
    });
  }

  await logAlowareEvent(supabase, {
    event_type: "call_completed",
    team_id: teamId,
    processed: true,
    counters: { updated: existingCall ? 1 : 0, created: existingCall ? 0 : 1 },
  });

  return jsonRes({ success: true, callId: callRecord?.id });
}

// deno-lint-ignore no-explicit-any
async function handleTranscriptionSaved(supabase: any, teamId: string, payload: any) {
  const callId = payload.call_id ?? payload.id;
  const transcription = payload.transcription ?? payload.transcript ?? "";
  if (!callId || !transcription) return jsonRes({ success: false, error: "missing_fields" }, 400);

  const { data: call } = await supabase
    .from("calls")
    .select("id, user_id, team_id")
    .eq("aloware_call_id", String(callId))
    .eq("team_id", teamId)
    .maybeSingle();

  if (!call) {
    await logAlowareEvent(supabase, {
      event_type: "transcription_unmatched",
      team_id: teamId,
      processed: false,
      error_code: "no_call",
    });
    return jsonRes({ success: false, error: "call_not_found" }, 200);
  }

  await supabase.from("calls").update({ aloware_transcription: transcription }).eq("id", call.id);

  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/process-aloware-transcription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ callId: call.id, transcription }),
    });
  } catch {
    // downstream analysis failure must not break the webhook
  }

  await logAlowareEvent(supabase, {
    event_type: "transcription_saved",
    team_id: teamId,
    processed: true,
    counters: { chars: String(transcription).length },
  });
  return jsonRes({ success: true, callId: call.id });
}

// deno-lint-ignore no-explicit-any
async function handleRecordingSaved(supabase: any, teamId: string, payload: any) {
  const callId = payload.call_id ?? payload.id;
  const recordingUrl = payload.recording_url ?? payload.recording ?? payload.url ?? null;
  if (!callId) return jsonRes({ success: true, message: "no_call_id" });
  const { data: call } = await supabase
    .from("calls")
    .update({ aloware_recording_url: recordingUrl })
    .eq("aloware_call_id", String(callId))
    .eq("team_id", teamId)
    .select("id")
    .maybeSingle();
  await logAlowareEvent(supabase, {
    event_type: "recording_saved",
    team_id: teamId,
    processed: !!call,
    counters: { matched: call ? 1 : 0 },
  });
  return jsonRes({ success: true, callId: call?.id });
}

// deno-lint-ignore no-explicit-any
async function handleCallSummarized(supabase: any, teamId: string, payload: any) {
  const callId = payload.call_id ?? payload.id;
  const summary = payload.summary ?? payload.call_summary ?? null;
  if (!callId || !summary) return jsonRes({ success: true, message: "no_summary" });
  const { data: call } = await supabase
    .from("calls")
    .update({ ai_analysis: { summary } })
    .eq("aloware_call_id", String(callId))
    .eq("team_id", teamId)
    .select("id")
    .maybeSingle();
  await logAlowareEvent(supabase, {
    event_type: "call_summarized",
    team_id: teamId,
    processed: !!call,
    counters: { matched: call ? 1 : 0 },
  });
  return jsonRes({ success: true, callId: call?.id });
}

// deno-lint-ignore no-explicit-any
async function handleVoicemailSaved(supabase: any, teamId: string, payload: any) {
  await logAlowareEvent(supabase, {
    event_type: "voicemail_saved",
    team_id: teamId,
    processed: true,
    counters: { has_payload: payload ? 1 : 0 },
  });
  return jsonRes({ success: true });
}

// deno-lint-ignore no-explicit-any
async function handleAppointmentSaved(supabase: any, teamId: string, payload: any) {
  await logAlowareEvent(supabase, {
    event_type: "appointment_saved",
    team_id: teamId,
    processed: true,
    counters: { has_payload: payload ? 1 : 0 },
  });
  return jsonRes({ success: true });
}
