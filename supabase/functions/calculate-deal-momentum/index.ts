import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  authenticatePostOrService, corsHeaders, errorResponse, jsonResponse,
  readBoundedJson, isUuid,
} from "../_shared/edgeAuth.ts";
import { requireTeamEntitlement } from "../_shared/entitlement.ts";

interface StageHistory { deal_id: string; from_stage: string | null; to_stage: string; changed_at: string; }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await authenticatePostOrService(req);
  if (!auth.ok) return auth.response;
  const { userId, serviceClient, isService } = auth.ctx;

  const body = await readBoundedJson(req, 4 * 1024);
  if (!body || typeof body !== "object") return errorResponse("invalid_body", 400);
  const rawDealId = (body as Record<string, unknown>).deal_id;
  const deal_id = rawDealId == null ? null : (isUuid(rawDealId) ? String(rawDealId) : null);
  if (rawDealId != null && !deal_id) return errorResponse("invalid_body", 400);

  try {
    let dealsQuery = serviceClient
      .from("deals").select("*").not("stage", "in", "(closed_won,closed_lost)");
    if (deal_id) dealsQuery = dealsQuery.eq("id", deal_id);
    else if (!isService) dealsQuery = dealsQuery.eq("user_id", userId);

    const { data: deals, error: dealsError } = await dealsQuery;
    if (dealsError) { console.error("[calculate-deal-momentum] query_failed"); return errorResponse("internal_error", 500); }

    if (deal_id && deals?.[0] && !isService && deals[0].user_id !== userId) return errorResponse("forbidden", 403);
    if (!deals || deals.length === 0) return jsonResponse({ success: true, message: "No deals to process" });

    const results = [];
    for (const deal of deals) {
      const { data: history } = await serviceClient
        .from("deal_stage_history").select("*").eq("deal_id", deal.id).order("changed_at", { ascending: true });
      const stageHistory: StageHistory[] = history ?? [];
      let score = 50;
      const now = new Date();
      const dealCreated = new Date(deal.created_at);
      const dealUpdated = new Date(deal.updated_at);
      const daysSinceUpdate = Math.floor((now.getTime() - dealUpdated.getTime()) / 86400000);
      if (daysSinceUpdate <= 1) score += 25;
      else if (daysSinceUpdate <= 3) score += 20;
      else if (daysSinceUpdate <= 7) score += 10;
      else if (daysSinceUpdate <= 30) score -= 15;
      else score -= 30;
      const totalDays = Math.max(1, Math.floor((now.getTime() - dealCreated.getTime()) / 86400000));
      const velocity = stageHistory.length / totalDays;
      if (velocity >= 0.1) score += 25;
      else if (velocity >= 0.05) score += 15;
      else if (velocity >= 0.02) score += 5;
      else score -= 10;
      if (stageHistory.length > 0) {
        const daysInStage = Math.floor((now.getTime() - new Date(stageHistory[stageHistory.length - 1].changed_at).getTime()) / 86400000);
        const expected: Record<string, number> = { prospecting: 14, qualified: 10, demo_scheduled: 7, proposal_sent: 7, negotiation: 10 };
        const e = expected[deal.stage] || 10;
        if (daysInStage > e * 2) score -= 20;
        else if (daysInStage > e * 1.5) score -= 10;
        else if (daysInStage > e) score -= 5;
      }
      const stageOrder = ["prospecting","qualified","demo_scheduled","proposal_sent","negotiation"];
      const idx = stageOrder.indexOf(deal.stage);
      if (idx >= 3) score += 10; else if (idx >= 2) score += 5;
      if (deal.expected_close_date) {
        const daysUntilClose = Math.floor((new Date(deal.expected_close_date).getTime() - now.getTime()) / 86400000);
        if (daysUntilClose < 0) score -= 15;
        else if (daysUntilClose <= 7) score += 10;
        else if (daysUntilClose <= 14) score += 5;
      }
      const finalScore = Math.max(0, Math.min(100, score));
      const { error: updErr, count } = await serviceClient
        .from("deals").update({ momentum_score: finalScore }, { count: "exact" }).eq("id", deal.id);
      if (updErr) console.error("[calculate-deal-momentum] update_failed");
      results.push({ deal_id: deal.id, company_name: deal.company_name, previous_score: deal.momentum_score, new_score: finalScore, updated: (count ?? 0) > 0 });
    }

    return jsonResponse({ success: true, processed: results.length, results });
  } catch {
    console.error("[calculate-deal-momentum] internal_error");
    return errorResponse("internal_error", 500);
  }
});
