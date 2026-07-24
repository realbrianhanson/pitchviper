// Append normalized voice transcript lines to a roleplay session.
// Session ownership verified before touching the database; message payload
// is size- and count-bounded so a malicious client can't blow up storage.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticatePost, boundedString, corsHeaders, errorResponse, isUuid, jsonResponse } from "../_shared/edgeAuth.ts";
import { requireTeamEntitlement } from "../_shared/entitlement.ts";

const MAX_MESSAGES = 100;
const MAX_MESSAGE_CHARS = 5000;
const MAX_TOTAL_CHARS = 60000;

interface Incoming { role: "user" | "assistant"; content: string; timestamp?: string }

function nowIso(): string { return new Date().toISOString(); }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authenticatePost(req);
  if (!auth.ok) return auth.response;
  const { userId, serviceClient } = auth.ctx;

  const _ent = await requireTeamEntitlement(serviceClient, userId, "starter");
  if (!_ent.ok) return _ent.response;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return errorResponse("invalid_body", 400); }

  const sessionId = body.session_id;
  if (!isUuid(sessionId)) return errorResponse("invalid_session", 400);

  const raw = body.messages;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) {
    return errorResponse("invalid_messages", 400);
  }

  let total = 0;
  const clean: Array<Incoming & { speaker: string }> = [];
  for (const m of raw as Incoming[]) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
    const content = boundedString(m.content, MAX_MESSAGE_CHARS);
    if (!content) continue;
    total += content.length;
    if (total > MAX_TOTAL_CHARS) return errorResponse("payload_too_large", 413);
    clean.push({
      role: m.role,
      content,
      timestamp: nowIso(),
      speaker: m.role === "user" ? "rep" : "prospect",
    });
  }
  if (clean.length === 0) return jsonResponse({ appended: 0 });

  const { data: session } = await serviceClient
    .from("roleplay_sessions")
    .select("user_id, status")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.user_id !== userId) return errorResponse("session_not_found", 404);
  if (session.status !== "in_progress") return errorResponse("session_not_active", 409);

  const { error: appendError } = await serviceClient.rpc("append_roleplay_messages", {
    p_session_id: sessionId,
    p_messages: clean,
  });
  if (appendError) return errorResponse("append_failed", 500);

  return jsonResponse({ appended: clean.length });
});
