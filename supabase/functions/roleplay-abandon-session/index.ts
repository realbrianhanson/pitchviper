// Authenticated abandon flow. Clients no longer have direct UPDATE access
// on roleplay_sessions, so status transitions go through this endpoint.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticatePost, clampInt, corsHeaders, errorResponse, isUuid, jsonResponse } from "../_shared/edgeAuth.ts";
import { requireTeamEntitlement } from "../_shared/entitlement.ts";

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
  const duration = body.duration_seconds == null ? null : clampInt(body.duration_seconds, 0, 24 * 3600, 0);

  const { data, error } = await serviceClient.rpc("svc_abandon_roleplay_session", {
    _session_id: sessionId,
    _user_id: userId,
    _duration_seconds: duration,
  });
  if (error) return errorResponse("abandon_failed", 500);

  return jsonResponse(data ?? { abandoned: false });
});
