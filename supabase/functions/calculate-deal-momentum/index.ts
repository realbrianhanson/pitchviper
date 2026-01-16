import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Deal {
  id: string;
  stage: string;
  created_at: string;
  updated_at: string;
  expected_close_date: string | null;
}

interface StageHistory {
  deal_id: string;
  from_stage: string | null;
  to_stage: string;
  changed_at: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { deal_id } = await req.json();

    // If a specific deal_id is provided, calculate for that deal only
    // Otherwise, calculate for all active deals
    let dealsQuery = supabase
      .from("deals")
      .select("*")
      .not("stage", "in", "(closed_won,closed_lost)");

    if (deal_id) {
      dealsQuery = dealsQuery.eq("id", deal_id);
    }

    const { data: deals, error: dealsError } = await dealsQuery;

    if (dealsError) throw dealsError;
    if (!deals || deals.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No deals to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const deal of deals) {
      // Get stage history for this deal
      const { data: history } = await supabase
        .from("deal_stage_history")
        .select("*")
        .eq("deal_id", deal.id)
        .order("changed_at", { ascending: true });

      const stageHistory: StageHistory[] = history || [];
      
      // Calculate momentum score based on multiple factors
      let score = 50; // Base score

      const now = new Date();
      const dealCreated = new Date(deal.created_at);
      const dealUpdated = new Date(deal.updated_at);

      // 1. Recency of activity (max 25 points)
      const daysSinceUpdate = Math.floor((now.getTime() - dealUpdated.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceUpdate <= 1) {
        score += 25;
      } else if (daysSinceUpdate <= 3) {
        score += 20;
      } else if (daysSinceUpdate <= 7) {
        score += 10;
      } else if (daysSinceUpdate <= 14) {
        score += 0;
      } else if (daysSinceUpdate <= 30) {
        score -= 15;
      } else {
        score -= 30;
      }

      // 2. Stage velocity (max 25 points)
      const totalDaysInPipeline = Math.max(1, Math.floor((now.getTime() - dealCreated.getTime()) / (1000 * 60 * 60 * 24)));
      const stageChanges = stageHistory.length;
      const velocityRate = stageChanges / totalDaysInPipeline;

      if (velocityRate >= 0.1) {
        score += 25; // Fast mover
      } else if (velocityRate >= 0.05) {
        score += 15;
      } else if (velocityRate >= 0.02) {
        score += 5;
      } else {
        score -= 10; // Stalled
      }

      // 3. Time in current stage penalty (max -20 points)
      if (stageHistory.length > 0) {
        const lastStageChange = new Date(stageHistory[stageHistory.length - 1].changed_at);
        const daysInCurrentStage = Math.floor((now.getTime() - lastStageChange.getTime()) / (1000 * 60 * 60 * 24));
        
        // Expected days per stage (varies by stage)
        const expectedDays: Record<string, number> = {
          prospecting: 14,
          qualified: 10,
          demo_scheduled: 7,
          proposal_sent: 7,
          negotiation: 10,
        };
        
        const expected = expectedDays[deal.stage] || 10;
        
        if (daysInCurrentStage > expected * 2) {
          score -= 20;
        } else if (daysInCurrentStage > expected * 1.5) {
          score -= 10;
        } else if (daysInCurrentStage > expected) {
          score -= 5;
        }
      }

      // 4. Stage progression bonus (max 10 points)
      const stageOrder = ['prospecting', 'qualified', 'demo_scheduled', 'proposal_sent', 'negotiation'];
      const currentStageIndex = stageOrder.indexOf(deal.stage);
      if (currentStageIndex >= 3) {
        score += 10; // Late stage deals get bonus
      } else if (currentStageIndex >= 2) {
        score += 5;
      }

      // 5. Close date proximity (max 10 points / -10 points)
      if (deal.expected_close_date) {
        const closeDate = new Date(deal.expected_close_date);
        const daysUntilClose = Math.floor((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilClose < 0) {
          score -= 15; // Overdue
        } else if (daysUntilClose <= 7) {
          score += 10; // Closing soon
        } else if (daysUntilClose <= 14) {
          score += 5;
        }
      }

      // Clamp score between 0 and 100
      const finalScore = Math.max(0, Math.min(100, score));

      // Update the deal's momentum score
      const { error: updateError } = await supabase
        .from("deals")
        .update({ momentum_score: finalScore })
        .eq("id", deal.id);

      if (updateError) {
        console.error(`Error updating deal ${deal.id}:`, updateError);
      }

      results.push({
        deal_id: deal.id,
        company_name: deal.company_name,
        previous_score: deal.momentum_score,
        new_score: finalScore,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error calculating momentum:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
