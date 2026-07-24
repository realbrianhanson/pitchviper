import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { timingSafeEqualStrings } from "../_shared/timingSafe.ts";
import { logAlowareEvent, readBoundedJson } from "../_shared/alowareSafe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-aloware-signature",
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
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ error: "method_not_allowed" }, 405);

  const expectedSecret = Deno.env.get("ALOWARE_WEBHOOK_SECRET");
  if (!expectedSecret) return jsonRes({ error: "webhook_unconfigured" }, 401);
  const provided = req.headers.get("X-Aloware-Signature") ?? "";
  if (!(await timingSafeEqualStrings(provided, expectedSecret))) return jsonRes({ error: "invalid_signature" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const payload = (await readBoundedJson(req, 262_144)) as Record<string, unknown> | null;
  if (!payload) return jsonRes({ error: "invalid_body" }, 400);

  try {
    const rawEventType = String(payload.event_type ?? payload.type ?? payload.event ?? "unknown");
    const eventType = rawEventType.toLowerCase().replace(/\s+/g, "_");

    if (eventType.includes("call_disposed") || eventType.includes("communication_disposed") || eventType.includes("call_completed") || eventType.includes("call.completed")) {
      return await handleCallCompleted(supabase, payload);
    }
    if (eventType.includes("recording_saved")) return await handleRecordingSaved(supabase, payload);
    if (eventType.includes("transcription_saved") || payload.transcription) return await handleTranscriptionSaved(supabase, payload);
    if (eventType.includes("call_summarized")) return await handleCallSummarized(supabase, payload);
    if (eventType.includes("voicemail_saved")) return await handleVoicemailSaved(supabase, payload);
    if (eventType.includes("appointment_saved")) return await handleAppointmentSaved(supabase, payload);

    await logAlowareEvent(supabase, { event_type: eventType.slice(0, 64), processed: false, error_code: "unknown_event" });
    return jsonRes({ success: true, message: "Event received" });
  } catch {
    await logAlowareEvent(supabase, { event_type: "webhook_error", processed: false, error_code: "handler_error" });
    return jsonRes({ success: false, error: "processing_failed" }, 500);
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCallCompleted(supabase: any, payload: any) {
  const callId = payload.call_id ?? payload.id;
  const alowareUserId = payload.user_id ?? payload.agent_id;
  const contact = payload.contact ?? {};
  const durationSeconds = Number(payload.duration_seconds ?? payload.duration ?? 0) || 0;
  const direction = String(payload.direction ?? "").toLowerCase() === "inbound" ? "inbound" : "outbound";
  const dispositionRaw = String(payload.disposition ?? payload.status ?? "");
  const recordingUrl = payload.recording_url ?? payload.recording ?? null;
  const timestamp = payload.timestamp ?? payload.created_at ?? new Date().toISOString();

  const { data: profile } = await supabase
    .from("profiles").select("user_id, team_id, full_name")
    .eq("aloware_user_id", String(alowareUserId)).maybeSingle();
  if (!profile) {
    await logAlowareEvent(supabase, { event_type: "call_unmatched", processed: false, error_code: "no_matching_user" });
    return jsonRes({ success: false, error: "user_not_found" }, 200);
  }

  const disposition = DISPOSITION_MAP[dispositionRaw] ?? (dispositionRaw ? dispositionRaw.toLowerCase().replace(/\s+/g, "_") : null);
  const outcomeRaw = String(payload.outcome ?? payload.call_status ?? "connected").toLowerCase();
  const outcome = OUTCOME_MAP[outcomeRaw] ?? "connected";

  const { data: existingCall } = await supabase
    .from("calls").select("id").eq("aloware_call_id", String(callId)).maybeSingle();

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
      .eq("id", existingCall.id).select("id").maybeSingle();
    if (error) throw error;
    callRecord = data;
  } else {
    const { data, error } = await supabase
      .from("calls").insert({
        user_id: profile.user_id,
        team_id: profile.team_id,
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
      }).select("id").maybeSingle();
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
    team_id: profile.team_id,
    processed: true,
    counters: { updated: existingCall ? 1 : 0, created: existingCall ? 0 : 1 },
  });

  return jsonRes({ success: true, callId: callRecord?.id });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleTranscriptionSaved(supabase: any, payload: any) {
  const callId = payload.call_id ?? payload.id;
  const transcription = payload.transcription ?? payload.transcript ?? "";
  if (!callId || !transcription) return jsonRes({ success: false, error: "missing_fields" }, 400);

  const { data: call } = await supabase
    .from("calls").select("id, user_id").eq("aloware_call_id", String(callId)).maybeSingle();
  if (!call) {
    await logAlowareEvent(supabase, { event_type: "transcription_unmatched", processed: false, error_code: "no_call" });
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

  await logAlowareEvent(supabase, { event_type: "transcription_saved", processed: true, counters: { chars: String(transcription).length } });
  return jsonRes({ success: true, callId: call.id });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleRecordingSaved(supabase: any, payload: any) {
  const callId = payload.call_id ?? payload.id;
  const recordingUrl = payload.recording_url ?? payload.recording ?? payload.url ?? null;
  if (!callId) return jsonRes({ success: true, message: "no_call_id" });
  const { data: call } = await supabase
    .from("calls").update({ aloware_recording_url: recordingUrl }).eq("aloware_call_id", String(callId)).select("id").maybeSingle();
  await logAlowareEvent(supabase, { event_type: "recording_saved", processed: !!call, counters: { matched: call ? 1 : 0 } });
  return jsonRes({ success: true, callId: call?.id });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCallSummarized(supabase: any, payload: any) {
  const callId = payload.call_id ?? payload.id;
  const summary = payload.summary ?? payload.call_summary ?? payload.ai_summary ?? "";
  if (!callId || !summary) return jsonRes({ success: true, message: "missing_fields" });
  const { data: call } = await supabase
    .from("calls").update({ aloware_summary: summary }).eq("aloware_call_id", String(callId)).select("id").maybeSingle();
  await logAlowareEvent(supabase, { event_type: "call_summarized", processed: !!call, counters: { matched: call ? 1 : 0 } });
  return jsonRes({ success: true, callId: call?.id });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleVoicemailSaved(supabase: any, payload: any) {
  const callId = payload.call_id ?? payload.id;
  const voicemailUrl = payload.voicemail_url ?? payload.recording_url ?? payload.url ?? null;
  const alowareUserId = payload.user_id ?? payload.agent_id;
  const { data: profile } = await supabase
    .from("profiles").select("user_id, team_id").eq("aloware_user_id", String(alowareUserId)).maybeSingle();
  if (!profile) return jsonRes({ success: true, message: "no_user" });
  if (callId) {
    await supabase.from("calls")
      .update({ outcome: "voicemail", aloware_recording_url: voicemailUrl })
      .eq("aloware_call_id", String(callId));
  }
  await logAlowareEvent(supabase, { event_type: "voicemail_saved", team_id: profile.team_id, processed: true });
  return jsonRes({ success: true });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleAppointmentSaved(supabase: any, payload: any) {
  const alowareUserId = payload.user_id ?? payload.agent_id;
  const { data: profile } = await supabase
    .from("profiles").select("user_id, team_id").eq("aloware_user_id", String(alowareUserId)).maybeSingle();
  if (!profile) return jsonRes({ success: true, message: "no_user" });
  await supabase.from("notifications").insert({
    user_id: profile.user_id,
    type: "followup_due",
    title: "📅 Appointment Synced",
    body: "An appointment was synced from Aloware. Check your pipeline.",
    action_url: "/pipeline",
  });
  await logAlowareEvent(supabase, { event_type: "appointment_saved", team_id: profile.team_id, processed: true });
  return jsonRes({ success: true, userId: profile.user_id });
}
