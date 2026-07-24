// Live per-turn voice analysis. Best-effort, POST-only, self-authenticated.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticatePost, boundedString, corsHeaders, errorResponse, isUuid, jsonResponse } from "../_shared/edgeAuth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { requireTeamEntitlement } from "../_shared/entitlement.ts";

interface AnalysisResult {
  addressed_objection: boolean;
  attempted_close: boolean;
  positive_momentum: boolean;
  win_conditions_achieved: string[];
}

const EMPTY: AnalysisResult = {
  addressed_objection: false,
  attempted_close: false,
  positive_momentum: false,
  win_conditions_achieved: [],
};

function clampAnalysis(raw: unknown, winSet: Set<string>): AnalysisResult {
  const obj = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const arr = Array.isArray(obj.win_conditions_achieved) ? obj.win_conditions_achieved : [];
  return {
    addressed_objection: obj.addressed_objection === true,
    attempted_close: obj.attempted_close === true,
    positive_momentum: obj.positive_momentum === true,
    win_conditions_achieved: arr
      .filter((v): v is string => typeof v === "string" && winSet.has(v))
      .slice(0, 10),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authenticatePost(req);
  if (!auth.ok) return auth.response;
  const { userId, serviceClient } = auth.ctx;

  const _ent = await requireTeamEntitlement(serviceClient, userId, "starter");
  if (!_ent.ok) return _ent.response;
  const rl = await enforceRateLimit(userId, "roleplay-voice-analyze", { perMinute: 30, perDay: 400, serviceClient });
  if (!rl.allowed) return rl.response!;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return errorResponse("invalid_body", 400); }

  const sessionId = body.session_id;
  const scenarioId = body.scenario_id;
  if (!isUuid(sessionId) || !isUuid(scenarioId)) return errorResponse("invalid_ids", 400);

  const userMessage = boundedString(body.user_message, 2000);
  const agentMessage = boundedString(body.agent_message, 2000) ?? "";
  if (!userMessage) return errorResponse("invalid_message", 400);

  const { data: session } = await serviceClient
    .from("roleplay_sessions")
    .select("user_id, scenario_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.user_id !== userId || session.scenario_id !== scenarioId) {
    return errorResponse("session_not_found", 404);
  }

  const { data: scenario } = await serviceClient
    .from("roleplay_scenarios")
    .select("win_conditions, objections_to_include")
    .eq("id", scenarioId)
    .maybeSingle();
  if (!scenario) return errorResponse("scenario_not_found", 404);

  const winConditions: string[] = Array.isArray(scenario.win_conditions) ? scenario.win_conditions : [];
  const objections: string[] = Array.isArray(scenario.objections_to_include) ? scenario.objections_to_include : [];
  const winSet = new Set(winConditions);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return jsonResponse({ analysis: EMPTY });

  const prompt = `Analyze this sales conversation exchange.

Salesperson: "${userMessage}"
Prospect: "${agentMessage || "(no response)"}"

Win conditions:
${winConditions.map((w) => `- ${w}`).join("\n")}

Known objections:
${objections.map((o) => `- ${o}`).join("\n")}

Return ONLY JSON:
{"addressed_objection":true|false,"attempted_close":true|false,"positive_momentum":true|false,"win_conditions_achieved":["exact strings from list"]}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You analyze sales conversations. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      max_tokens: 250,
      temperature: 0.2,
    }),
  });

  if (!res.ok) return jsonResponse({ analysis: EMPTY });

  const data = await res.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return jsonResponse({ analysis: EMPTY });
  try {
    const parsed = JSON.parse(content.replace(/```json\s*|```/gi, "").trim());
    return jsonResponse({ analysis: clampAnalysis(parsed, winSet) });
  } catch {
    return jsonResponse({ analysis: EMPTY });
  }
});
