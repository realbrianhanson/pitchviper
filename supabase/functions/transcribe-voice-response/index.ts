import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticatePost, corsHeaders, errorResponse, jsonResponse } from "../_shared/edgeAuth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { requireTeamEntitlement } from "../_shared/entitlement.ts";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME = new Set([
  "audio/webm", "audio/webm;codecs=opus", "audio/ogg", "audio/ogg;codecs=opus",
  "audio/wav", "audio/wave", "audio/x-wav", "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac",
]);

function mimeAllowed(type: string | undefined | null): boolean {
  if (!type) return false;
  const base = type.split(";")[0].trim().toLowerCase();
  if (ALLOWED_MIME.has(type.toLowerCase()) || ALLOWED_MIME.has(base)) return true;
  return base.startsWith("audio/");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authenticatePost(req);
  if (!auth.ok) return auth.response;
  const { userId, serviceClient } = auth.ctx;

  const _ent = await requireTeamEntitlement(serviceClient, userId, "starter");
  if (!_ent.ok) return _ent.response;
  const rl = await enforceRateLimit(userId, "transcribe-voice-response", { perMinute: 20, perDay: 300, serviceClient });
  if (!rl.allowed) return rl.response!;

  let formData: FormData;
  try { formData = await req.formData(); } catch { return errorResponse("invalid_body", 400); }

  // Enforce exactly one audio file field
  const entries = Array.from(formData.entries()).filter(([k]) => k === "audio");
  if (entries.length !== 1) return errorResponse("invalid_audio", 400);
  const audio = entries[0][1];
  if (!(audio instanceof File)) return errorResponse("invalid_audio", 400);
  if (audio.size === 0) return errorResponse("empty_audio", 400);
  if (audio.size > MAX_BYTES) return errorResponse("audio_too_large", 413);
  if (!mimeAllowed(audio.type)) return errorResponse("unsupported_audio_type", 415);

  const key = Deno.env.get("ELEVENLABS_API_KEY");
  if (!key) return errorResponse("stt_not_configured", 503);

  const upstream = new FormData();
  upstream.append("file", audio);
  upstream.append("model_id", "scribe_v1");
  upstream.append("language_code", "eng");

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": key },
    body: upstream,
  });
  if (!res.ok) {
    if (res.status === 429) return errorResponse("rate_limit", 429);
    return errorResponse("stt_failed", 502);
  }

  const data = await res.json().catch(() => null);
  const text = typeof data?.text === "string" ? data.text : "";
  return jsonResponse({ text });
});
