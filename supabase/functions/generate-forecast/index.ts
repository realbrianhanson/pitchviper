import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { requireTeamEntitlement } from "../_shared/entitlement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Deal {
  id: string;
  user_id: string;
  company_name: string;
  deal_value: number;
  stage: string;
  probability: number;
  momentum_score: number;
  expected_close_date: string | null;
}

interface Profile {
  user_id: string;
  full_name: string;
  team_id: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') { return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const rl = await enforceRateLimit(userData.user.id, 'generate-forecast', { serviceClient: supabase });
    const _ent = await requireTeamEntitlement(supabase, userData.user.id, "growth");
    if (!_ent.ok) return _ent.response;
    if (!rl.allowed) return rl.response!;

    const { team_id, user_id } = await req.json();

    // Authorization: user must be self, or member of requested team
    if (user_id && user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (team_id) {
      const { data: callerProfile } = await supabase.from('profiles').select('team_id').eq('user_id', userData.user.id).maybeSingle();
      if (callerProfile?.team_id !== team_id) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Get current month bounds
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Fetch open deals
    let dealsQuery = supabase
      .from("deals")
      .select("*")
      .not("stage", "in", "(closed_won,closed_lost)");

    if (team_id) {
      dealsQuery = dealsQuery.eq("team_id", team_id);
    } else if (user_id) {
      dealsQuery = dealsQuery.eq("user_id", user_id);
    }

    const { data: deals, error: dealsError } = await dealsQuery;
    if (dealsError) throw dealsError;

    // Fetch closed deals this month for historical analysis
    let closedQuery = supabase
      .from("deals")
      .select("*")
      .eq("stage", "closed_won")
      .gte("closed_at", monthStart.toISOString())
      .lte("closed_at", monthEnd.toISOString());

    if (team_id) {
      closedQuery = closedQuery.eq("team_id", team_id);
    } else if (user_id) {
      closedQuery = closedQuery.eq("user_id", user_id);
    }

    const { data: closedDeals } = await closedQuery;

    // Get profiles for team breakdown
    const userIds = [...new Set((deals || []).map(d => d.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, team_id")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    // Calculate metrics
    const openDeals = deals || [];
    const totalPipelineValue = openDeals.reduce((sum, d) => sum + Number(d.deal_value), 0);
    const weightedForecast = openDeals.reduce((sum, d) => sum + Number(d.deal_value) * (d.probability / 100), 0);
    
    // Calculate best/worst case with momentum adjustment
    const bestCase = openDeals.reduce((sum, d) => {
      const adjustedProb = Math.min(100, d.probability + (d.momentum_score > 70 ? 15 : d.momentum_score > 40 ? 5 : 0));
      return sum + Number(d.deal_value) * (adjustedProb / 100);
    }, 0);

    const worstCase = openDeals.reduce((sum, d) => {
      const adjustedProb = Math.max(0, d.probability - (d.momentum_score < 30 ? 20 : d.momentum_score < 50 ? 10 : 0));
      return sum + Number(d.deal_value) * (adjustedProb / 100);
    }, 0);

    // Deals at risk (low momentum, closing this month)
    const atRiskDeals = openDeals.filter(d => {
      if (!d.expected_close_date) return false;
      const closeDate = new Date(d.expected_close_date);
      return closeDate <= monthEnd && d.momentum_score < 40;
    });

    const atRiskValue = atRiskDeals.reduce((sum, d) => sum + Number(d.deal_value), 0);

    // Calculate per-rep breakdown
    const repBreakdown = new Map<string, {
      name: string;
      pipelineValue: number;
      weightedForecast: number;
      dealCount: number;
      avgProbability: number;
    }>();

    openDeals.forEach(deal => {
      const profile = profileMap.get(deal.user_id);
      const repName = profile?.full_name || "Unknown";
      
      const existing = repBreakdown.get(deal.user_id) || {
        name: repName,
        pipelineValue: 0,
        weightedForecast: 0,
        dealCount: 0,
        avgProbability: 0,
      };

      existing.pipelineValue += Number(deal.deal_value);
      existing.weightedForecast += Number(deal.deal_value) * (deal.probability / 100);
      existing.dealCount += 1;
      
      repBreakdown.set(deal.user_id, existing);
    });

    // Calculate average probability per rep
    repBreakdown.forEach((rep, userId) => {
      const repDeals = openDeals.filter(d => d.user_id === userId);
      rep.avgProbability = repDeals.length > 0
        ? Math.round(repDeals.reduce((sum, d) => sum + d.probability, 0) / repDeals.length)
        : 0;
    });

    const repForecast = Array.from(repBreakdown.values()).sort((a, b) => b.pipelineValue - a.pipelineValue);

    // Calculate closed this month
    const closedThisMonth = closedDeals || [];
    const revenueClosedThisMonth = closedThisMonth.reduce((sum, d) => sum + Number(d.deal_value), 0);

    // Generate AI insights
    let insights: string[] = [];
    
    try {
      const aiPrompt = `You are a sales forecasting analyst. Analyze this pipeline data and provide 3-4 brief, actionable insights.

PIPELINE DATA:
- Total Pipeline Value: $${totalPipelineValue.toLocaleString()}
- Weighted Forecast: $${weightedForecast.toLocaleString()}
- Best Case: $${bestCase.toLocaleString()}
- Worst Case: $${worstCase.toLocaleString()}
- Open Deals: ${openDeals.length}
- Deals at Risk: ${atRiskDeals.length} worth $${atRiskValue.toLocaleString()}
- Revenue Closed This Month: $${revenueClosedThisMonth.toLocaleString()}
- Deals Closed This Month: ${closedThisMonth.length}

TOP DEALS AT RISK:
${atRiskDeals.slice(0, 3).map(d => `- ${d.company_name}: $${Number(d.deal_value).toLocaleString()} (${d.momentum_score}/100 momentum)`).join('\n')}

REP BREAKDOWN:
${repForecast.slice(0, 5).map(r => `- ${r.name}: $${r.pipelineValue.toLocaleString()} pipeline, ${r.dealCount} deals`).join('\n')}

Provide exactly 4 insights as a JSON array of strings. Each insight should be one sentence, specific, and actionable. Focus on:
1. At-risk deals and recovery actions
2. Top performers or laggards
3. Forecast confidence based on momentum
4. Recommended focus for the rest of the month

Return ONLY a JSON array like: ["insight 1", "insight 2", "insight 3", "insight 4"]`;

      const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: aiPrompt }],
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const aiResponse = await response.json();
        const content = aiResponse.choices?.[0]?.message?.content || "";
        
        try {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            insights = JSON.parse(jsonMatch[0]);
          }
        } catch {
          // Generate default insights if parsing fails
          insights = [
            `${atRiskDeals.length} deals worth $${atRiskValue.toLocaleString()} are at risk of slipping due to low momentum.`,
            `Weighted forecast of $${weightedForecast.toLocaleString()} represents ${Math.round((weightedForecast / totalPipelineValue) * 100)}% of total pipeline.`,
            `${closedThisMonth.length} deals closed this month for $${revenueClosedThisMonth.toLocaleString()} in revenue.`,
            `Focus on high-momentum deals to maximize close rate before month end.`,
          ];
        }
      }
    } catch (aiError) {
      console.error("ai_insights_error");
      insights = [
        `${atRiskDeals.length} deals at risk, worth $${atRiskValue.toLocaleString()}.`,
        `Weighted forecast: $${weightedForecast.toLocaleString()}.`,
      ];
    }

    return new Response(
      JSON.stringify({
        success: true,
        forecast: {
          totalPipelineValue,
          weightedForecast,
          bestCase,
          worstCase,
          openDealsCount: openDeals.length,
          atRiskCount: atRiskDeals.length,
          atRiskValue,
          revenueClosedThisMonth,
          dealsClosedThisMonth: closedThisMonth.length,
        },
        repForecast,
        insights,
        atRiskDeals: atRiskDeals.slice(0, 5).map(d => ({
          id: d.id,
          company: d.company_name,
          value: d.deal_value,
          momentum: d.momentum_score,
          stage: d.stage,
        })),
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = "internal_error";
    console.error("internal_error");
    return new Response(
      JSON.stringify({ error: "internal_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
