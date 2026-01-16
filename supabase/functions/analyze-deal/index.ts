import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { deal_id } = await req.json();

    if (!deal_id) {
      throw new Error("deal_id is required");
    }

    // Fetch deal data
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("*")
      .eq("id", deal_id)
      .single();

    if (dealError || !deal) {
      throw new Error("Deal not found");
    }

    // Fetch stage history
    const { data: history } = await supabase
      .from("deal_stage_history")
      .select("*")
      .eq("deal_id", deal_id)
      .order("changed_at", { ascending: false })
      .limit(10);

    // Calculate days in pipeline
    const now = new Date();
    const created = new Date(deal.created_at);
    const daysInPipeline = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate days in current stage
    let daysInCurrentStage = 0;
    if (history && history.length > 0) {
      const lastChange = new Date(history[0].changed_at);
      daysInCurrentStage = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Build context for AI
    const dealContext = {
      company: deal.company_name,
      contact: deal.contact_name,
      value: deal.deal_value,
      stage: deal.stage,
      dealType: deal.deal_type,
      probability: deal.probability,
      momentumScore: deal.momentum_score,
      source: deal.source,
      notes: deal.notes,
      expectedCloseDate: deal.expected_close_date,
      daysInPipeline,
      daysInCurrentStage,
      stageChanges: history?.length || 0,
    };

    const prompt = `You are an AI sales coach analyzing a deal. Provide actionable, specific coaching advice.

DEAL INFORMATION:
- Company: ${dealContext.company}
- Contact: ${dealContext.contact}
- Deal Value: $${dealContext.value}
- Current Stage: ${dealContext.stage.replace('_', ' ')}
- Deal Type: ${dealContext.dealType.replace('_', ' ')}
- Win Probability: ${dealContext.probability}%
- Momentum Score: ${dealContext.momentumScore}/100
- Source: ${dealContext.source || 'Unknown'}
- Days in Pipeline: ${dealContext.daysInPipeline}
- Days in Current Stage: ${dealContext.daysInCurrentStage}
- Stage Changes: ${dealContext.stageChanges}
${dealContext.expectedCloseDate ? `- Expected Close: ${dealContext.expectedCloseDate}` : ''}
${dealContext.notes ? `- Notes: ${dealContext.notes}` : ''}

Analyze this deal and provide coaching in the following JSON format:
{
  "healthSummary": "One sentence assessment of deal health and likelihood to close",
  "riskFactors": [
    "Risk 1 that could derail this deal",
    "Risk 2 (if applicable)",
    "Risk 3 (if applicable)"
  ],
  "recommendedActions": [
    "Specific action to take next",
    "Second priority action",
    "Third action if applicable"
  ],
  "suggestedQuestions": [
    "Discovery or closing question to ask the prospect",
    "Another relevant question",
    "Third question"
  ],
  "objectionsToExpect": [
    "Likely objection based on deal profile",
    "Second potential objection"
  ],
  "nextBestStep": "The single most important thing to do RIGHT NOW"
}

Be specific and actionable. Consider the stage, momentum, and time factors in your analysis.`;

    // Call Lovable AI (Gemini)
    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${errorText}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let coaching;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      coaching = JSON.parse(jsonStr);
    } catch (parseError) {
      // If parsing fails, create a structured response from the text
      coaching = {
        healthSummary: "Unable to fully analyze - please review deal details manually.",
        riskFactors: ["Analysis incomplete - check deal activity"],
        recommendedActions: ["Review deal status and update notes"],
        suggestedQuestions: ["What are your key priorities this quarter?"],
        objectionsToExpect: ["Budget and timing concerns"],
        nextBestStep: "Schedule a follow-up call with the prospect",
        rawResponse: content,
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        dealId: deal_id,
        coaching,
        analyzedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error analyzing deal:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
