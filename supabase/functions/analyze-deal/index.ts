import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  authenticatePost, corsHeaders, errorResponse, jsonResponse,
  readBoundedJson, isUuid,
} from "../_shared/edgeAuth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { requireTeamEntitlement } from "../_shared/entitlement.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await authenticatePost(req);
  if (!auth.ok) return auth.response;
  const { userId, serviceClient } = auth.ctx;

  const ent = await requireTeamEntitlement(serviceClient, userId, "growth");
  if (!ent.ok) return ent.response;

  const rl = await enforceRateLimit(userId, "analyze-deal", { serviceClient, perMinute: 10, perDay: 200 });
  if (!rl.allowed) return rl.response!;

  const body = await readBoundedJson(req, 4 * 1024);
  if (!body || typeof body !== "object") return errorResponse("invalid_body", 400);
  const deal_id = isUuid((body as Record<string, unknown>).deal_id) ? (body as Record<string, string>).deal_id : null;
  if (!deal_id) return errorResponse("invalid_body", 400);

  const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE) return errorResponse("not_configured", 503);

  const { data: deal, error: dealError } = await serviceClient
    .from("deals").select("*").eq("id", deal_id).maybeSingle();
  if (dealError || !deal) return errorResponse("not_found", 404);
  if (deal.user_id !== userId) return errorResponse("forbidden", 403);

  const { data: history } = await serviceClient
    .from("deal_stage_history").select("*").eq("deal_id", deal_id)
    .order("changed_at", { ascending: false }).limit(10);

  const now = new Date();
  const created = new Date(deal.created_at);
  const daysInPipeline = Math.floor((now.getTime() - created.getTime()) / 86400000);
  let daysInCurrentStage = 0;
  if (history && history.length > 0) {
    daysInCurrentStage = Math.floor((now.getTime() - new Date(history[0].changed_at).getTime()) / 86400000);
  }

  const notesTrim = typeof deal.notes === "string" ? deal.notes.slice(0, 2000) : "";
  const prompt = `You are an AI sales coach analyzing a deal. Provide actionable coaching.

DEAL:
- Company: ${deal.company_name}
- Contact: ${deal.contact_name ?? "n/a"}
- Value: $${deal.deal_value}
- Stage: ${String(deal.stage).replace("_", " ")}
- Type: ${String(deal.deal_type ?? "").replace("_", " ")}
- Probability: ${deal.probability}%
- Momentum: ${deal.momentum_score}/100
- Days in pipeline: ${daysInPipeline}
- Days in current stage: ${daysInCurrentStage}
- Stage changes: ${history?.length ?? 0}
${deal.expected_close_date ? `- Expected close: ${deal.expected_close_date}` : ""}
${notesTrim ? `- Notes: ${notesTrim}` : ""}

Return strict JSON: { "healthSummary": string, "riskFactors": [string], "recommendedActions": [string], "suggestedQuestions": [string], "objectionsToExpect": [string], "nextBestStep": string }.`;

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });
  if (!r.ok) {
    if (r.status === 429) return errorResponse("rate_limited", 429);
    if (r.status === 402) return errorResponse("credits_exhausted", 402);
    console.error("[analyze-deal] ai_error", { status: r.status });
    return errorResponse("ai_failed", 502);
  }
  const aiResp = await r.json();
  const content = String(aiResp?.choices?.[0]?.message?.content ?? "");

  let coaching: Record<string, unknown>;
  try {
    const m = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    coaching = JSON.parse(m ? m[1] : content);
  } catch {
    coaching = {
      healthSummary: "Unable to fully analyze — review manually.",
      riskFactors: ["Analysis incomplete"],
      recommendedActions: ["Review deal status"],
      suggestedQuestions: ["What are your key priorities this quarter?"],
      objectionsToExpect: ["Budget and timing"],
      nextBestStep: "Schedule a follow-up call",
    };
  }

  return jsonResponse({ success: true, dealId: deal_id, coaching, analyzedAt: new Date().toISOString() });
});
