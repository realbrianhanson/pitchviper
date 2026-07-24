import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  authenticatePost, corsHeaders, errorResponse, jsonResponse,
  readBoundedJson, boundedString, isUuid, boundedStringArray,
} from "../_shared/edgeAuth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { requireTeamEntitlement } from "../_shared/entitlement.ts";

interface Message { role: "user" | "assistant" | "system"; content: string; timestamp?: string; }
interface AnalysisResult { addressed_objection: boolean; attempted_close: boolean; positive_momentum: boolean; win_conditions_achieved: string[]; }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await authenticatePost(req);
  if (!auth.ok) return auth.response;
  const { userId, serviceClient } = auth.ctx;

  const _ent = await requireTeamEntitlement(serviceClient, userId, "starter");
  if (!_ent.ok) return _ent.response;
  const rl = await enforceRateLimit(userId, "roleplay-chat", { serviceClient, perMinute: 30, perDay: 500 });
  if (!rl.allowed) return rl.response!;

  const body = await readBoundedJson(req, 96 * 1024);
  if (!body || typeof body !== "object") return errorResponse("invalid_body", 400);
  const b = body as Record<string, unknown>;

  const scenario_id = isUuid(b.scenario_id) ? b.scenario_id : null;
  const session_id = isUuid(b.session_id) ? b.session_id : null;
  const user_message = boundedString(b.user_message, 4000);
  if (!scenario_id || !session_id || !user_message) return errorResponse("invalid_body", 400);
  const history = Array.isArray(b.conversation_history) ? b.conversation_history.slice(-40) : [];
  const historyMsgs: Message[] = [];
  for (const m of history) {
    if (!m || typeof m !== "object") continue;
    const role = (m as { role?: string }).role;
    const content = boundedString((m as { content?: unknown }).content, 4000);
    if ((role === "user" || role === "assistant" || role === "system") && content) {
      historyMsgs.push({ role, content });
    }
  }

  const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE) return errorResponse("not_configured", 503);

  const { data: sessionOwner } = await serviceClient
    .from("roleplay_sessions").select("user_id").eq("id", session_id).maybeSingle();
  if (!sessionOwner || sessionOwner.user_id !== userId) return errorResponse("forbidden", 403);

  const { data: scenario, error: scenarioError } = await serviceClient
    .from("roleplay_scenarios").select("*").eq("id", scenario_id).maybeSingle();
  if (scenarioError || !scenario) return errorResponse("scenario_not_found", 404);

  const { data: profile } = await serviceClient
    .from("profiles").select("team_id").eq("user_id", userId).maybeSingle();

  let companyContext = "";
  if (profile?.team_id) {
    const { data: cs } = await serviceClient
      .from("company_settings")
      .select("company_name, product_description, value_propositions, common_use_cases, industry, target_audience")
      .eq("team_id", profile.team_id).maybeSingle();
    if (cs) {
      const vps = boundedStringArray(cs.value_propositions, 8, 200);
      const ucs = boundedStringArray(cs.common_use_cases, 8, 200);
      companyContext = `\n\nPRODUCT/COMPANY:\n- Company: ${cs.company_name ?? "Unknown"}\n${cs.industry ? `- Industry: ${cs.industry}\n` : ""}${cs.target_audience ? `- Target: ${cs.target_audience}\n` : ""}${cs.product_description ? `- Product: ${cs.product_description}\n` : ""}${vps.length ? `- Value: ${vps.join("; ")}\n` : ""}${ucs.length ? `- Use cases: ${ucs.join("; ")}\n` : ""}`;
    }
  }

  const objections = boundedStringArray(scenario.objections_to_include, 8, 240);
  const winConds = boundedStringArray(scenario.win_conditions, 8, 240);

  const systemPrompt = `You are playing a sales prospect. Stay in character.\n\nCHARACTER:\nName: ${getProspectName(scenario.name)}\nRole: ${scenario.prospect_persona}\n\nSITUATION:\n${scenario.prospect_situation}${companyContext}\n\nGUIDELINES:\n1. Stay in character\n2. Be realistic\n3. Weave in these objections naturally:\n${objections.map((o) => `   - "${o}"`).join("\n")}\n\n4. Respond in 2-4 sentences\n5. Show buying signals when the salesperson performs well\n\nWIN CONDITIONS:\n${winConds.map((w) => `- ${w}`).join("\n")}\n\nBe challenging but beatable.`;

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    ...historyMsgs,
    { role: "user", content: user_message },
  ];

  const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages, max_tokens: 500, temperature: 0.8 }),
  });
  if (!ai.ok) {
    if (ai.status === 429) return errorResponse("rate_limited", 429);
    if (ai.status === 402) return errorResponse("credits_exhausted", 402);
    console.error("[roleplay-chat] ai_error", { status: ai.status });
    return errorResponse("ai_failed", 502);
  }
  const aiData = await ai.json();
  const assistantMessage = String(aiData?.choices?.[0]?.message?.content ?? "I'm sorry, could you repeat?").slice(0, 4000);

  const analysisPrompt = `Analyze this sales exchange. Return only JSON.\n\nSalesperson: "${user_message.slice(0, 1500)}"\nProspect: "${assistantMessage.slice(0, 1500)}"\n\nWin conditions:\n${winConds.map((w) => `- ${w}`).join("\n")}\nObjections:\n${objections.map((o) => `- ${o}`).join("\n")}\n\nReturn JSON:\n{\n  "addressed_objection": bool,\n  "attempted_close": bool,\n  "positive_momentum": bool,\n  "win_conditions_achieved": [strings]\n}`;

  let analysis: AnalysisResult = { addressed_objection: false, attempted_close: false, positive_momentum: false, win_conditions_achieved: [] };
  try {
    const ar = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a sales coach. Return only valid JSON." },
          { role: "user", content: analysisPrompt },
        ],
        max_tokens: 300, temperature: 0.3,
      }),
    });
    if (ar.ok) {
      const ad = await ar.json();
      const text = String(ad?.choices?.[0]?.message?.content ?? "");
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        analysis = {
          addressed_objection: !!parsed.addressed_objection,
          attempted_close: !!parsed.attempted_close,
          positive_momentum: !!parsed.positive_momentum,
          win_conditions_achieved: boundedStringArray(parsed.win_conditions_achieved, 8, 240),
        };
      }
    }
  } catch {
    // fall through with defaults
  }

  const ts = new Date().toISOString();
  const newMessages = [
    { role: "user", content: user_message, timestamp: ts },
    { role: "assistant", content: assistantMessage, timestamp: new Date().toISOString() },
  ];
  const { error: appendError } = await serviceClient.rpc("append_roleplay_messages", {
    p_session_id: session_id, p_messages: newMessages,
  });
  if (appendError) console.error("[roleplay-chat] append_failed");

  return jsonResponse({ message: assistantMessage, analysis, timestamp: new Date().toISOString() });
});

function getProspectName(scenarioName: string): string {
  const names: Record<string, string> = {
    "The Hot Lead": "Alex Chen", "The Price Objector": "Morgan Williams",
    "The Tire Kicker": "Jordan Smith", "The Gatekeeper": "Taylor Martinez",
    "The Feature Demander": "Casey Johnson", "The Skeptical CFO": "Robin Anderson",
    "The Competitor Loyal": "Sam Thompson", "The Ghosted Follow-up": "Jamie Roberts",
  };
  return names[scenarioName] || "Chris Davis";
}
