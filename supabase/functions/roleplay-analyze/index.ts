import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface ScoreCategory {
  name: string;
  score: number;
  feedback: string;
}

interface AnalysisResult {
  outcome: "won" | "lost" | "progress";
  overall_score: number;
  categories: ScoreCategory[];
  strengths: string[];
  improvements: string[];
  key_moment: {
    type: "highlight" | "missed_opportunity";
    description: string;
  };
  xp_earned: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, scenario_id, transcript, duration_seconds, hints_used } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch scenario details
    const { data: scenario, error: scenarioError } = await supabase
      .from("roleplay_scenarios")
      .select("*")
      .eq("id", scenario_id)
      .single();

    if (scenarioError || !scenario) {
      throw new Error("Scenario not found");
    }

    // Fetch session: user_id + persisted transcript fallback
    const { data: sessionData, error: sessionError } = await supabase
      .from("roleplay_sessions")
      .select("user_id, transcript")
      .eq("id", session_id)
      .single();

    if (sessionError || !sessionData) {
      throw new Error("Session not found");
    }

    if (sessionData.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Prefer client transcript; fall back to persisted (voice mode writes each line as it arrives)
    let effectiveTranscript: Message[] = Array.isArray(transcript) ? (transcript as Message[]) : [];
    const persisted = Array.isArray(sessionData.transcript) ? (sessionData.transcript as Message[]) : [];
    if (persisted.length > effectiveTranscript.length) {
      console.log(`[roleplay-analyze] using persisted transcript (${persisted.length}) over client (${effectiveTranscript.length})`);
      effectiveTranscript = persisted;
    }

    const userTurns = effectiveTranscript.filter((m) => m.role === "user").length;
    const agentTurns = effectiveTranscript.filter((m) => m.role === "assistant").length;
    console.log(`[roleplay-analyze] session=${session_id} total=${effectiveTranscript.length} user=${userTurns} agent=${agentTurns}`);

    if (effectiveTranscript.length === 0 || userTurns === 0) {
      return new Response(
        JSON.stringify({ error: "Transcript missing salesperson turns — nothing to analyze." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transcriptText = effectiveTranscript
      .map((msg) => `${msg.role === "user" ? "SALESPERSON" : "PROSPECT"}: ${msg.content}`)
      .join("\n\n");

    console.log(`[roleplay-analyze] transcript preview:\n${transcriptText.slice(0, 800)}`);

    // Analysis prompt
    const analysisPrompt = `You are an expert sales coach analyzing a roleplay training session. Evaluate this sales conversation thoroughly.

SCENARIO: ${scenario.name}
DIFFICULTY: ${scenario.difficulty}
WIN CONDITIONS: ${scenario.win_conditions.join(", ")}
PROSPECT PERSONA: ${scenario.prospect_persona}
SITUATION: ${scenario.prospect_situation}

FULL TRANSCRIPT:
${transcriptText}

Analyze this conversation and return ONLY a valid JSON object (no markdown, no explanation, no code blocks) with this exact structure:
{
  "outcome": "won" or "lost" or "progress",
  "overall_score": <number 0-100>,
  "categories": [
    {"name": "Opening & Rapport", "score": <0-100>, "feedback": "<1 sentence>"},
    {"name": "Discovery Questions", "score": <0-100>, "feedback": "<1 sentence>"},
    {"name": "Objection Handling", "score": <0-100>, "feedback": "<1 sentence>"},
    {"name": "Value Presentation", "score": <0-100>, "feedback": "<1 sentence>"},
    {"name": "Closing Technique", "score": <0-100>, "feedback": "<1 sentence>"},
    {"name": "Conversation Control", "score": <0-100>, "feedback": "<1 sentence>"}
  ],
  "strengths": ["<specific thing they did well>", "<another strength>", "<third strength>"],
  "improvements": ["<specific area to improve>", "<another improvement>", "<third improvement>"],
  "key_moment": {
    "type": "highlight" or "missed_opportunity",
    "description": "<2-3 sentence description of the most notable moment>"
  }
}

SCORING GUIDELINES:
- outcome "won" = achieved main win condition (closed deal, booked meeting, etc.)
- outcome "progress" = prospect showed interest, agreed to next step but not main goal
- outcome "lost" = prospect declined, conversation ended poorly
- overall_score should reflect actual performance, be fair but honest
- Be specific in feedback - reference actual things said in the conversation
- For key_moment, pick the single most impactful moment (positive or negative)`;

    // Call Lovable AI with Gemini 2.5 Pro for better analysis
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "You are an expert sales coach. Return only valid JSON, no markdown." },
          { role: "user", content: analysisPrompt },
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Failed to get AI analysis");
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices?.[0]?.message?.content || "";

    // Parse the analysis
    let analysis: AnalysisResult;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (e) {
      console.error("Failed to parse analysis:", e, analysisText);
      // Return a default analysis
      analysis = {
        outcome: "progress",
        overall_score: 65,
        categories: [
          { name: "Opening & Rapport", score: 70, feedback: "Decent opening, could build more connection." },
          { name: "Discovery Questions", score: 60, feedback: "Asked some questions but could dig deeper." },
          { name: "Objection Handling", score: 65, feedback: "Addressed some concerns adequately." },
          { name: "Value Presentation", score: 70, feedback: "Communicated value but could be more specific." },
          { name: "Closing Technique", score: 55, feedback: "Need stronger close attempts." },
          { name: "Conversation Control", score: 65, feedback: "Maintained reasonable control of the conversation." },
        ],
        strengths: [
          "Engaged professionally with the prospect",
          "Showed knowledge of the product",
          "Remained calm under pressure",
        ],
        improvements: [
          "Ask more discovery questions early",
          "Handle objections with more confidence",
          "Close more assertively",
        ],
        key_moment: {
          type: "missed_opportunity",
          description: "There was an opportunity to address the prospect's core concern more directly.",
        },
        xp_earned: 0,
      };
    }

    // Calculate XP
    let xpEarned = 0;
    const baseXp = scenario.xp_reward;
    
    if (analysis.outcome === "won") {
      xpEarned = baseXp;
    } else if (analysis.outcome === "progress") {
      xpEarned = Math.floor(baseXp * 0.5);
    } else {
      xpEarned = Math.floor(baseXp * 0.25);
    }

    // Bonus for high scores
    if (analysis.overall_score >= 90) {
      xpEarned = Math.floor(xpEarned * 1.5);
    } else if (analysis.overall_score >= 80) {
      xpEarned = Math.floor(xpEarned * 1.25);
    }

    // Penalty for hints
    xpEarned = Math.max(0, xpEarned - (hints_used * 10));

    analysis.xp_earned = xpEarned;

    // Update session with results
    await supabase
      .from("roleplay_sessions")
      .update({
        status: "completed",
        score: analysis.overall_score,
        feedback: JSON.stringify(analysis),
        duration_seconds: duration_seconds,
        completed_at: new Date().toISOString(),
      })
      .eq("id", session_id);

    // Update user's XP
    const { data: profile } = await supabase
      .from("profiles")
      .select("xp_points")
      .eq("user_id", sessionData.user_id)
      .single();

    if (profile) {
      await supabase
        .from("profiles")
        .update({ xp_points: (profile.xp_points || 0) + xpEarned })
        .eq("user_id", sessionData.user_id);
    }

    // Log activity
    await supabase.from("activities").insert({
      user_id: sessionData.user_id,
      activity_type: "roleplay_completed",
      metadata: {
        scenario_name: scenario.name,
        scenario_id: scenario_id,
        score: analysis.overall_score,
        outcome: analysis.outcome,
        xp_earned: xpEarned,
        duration_seconds: duration_seconds,
      },
    });

    // Check if this is a new best score
    const { data: previousBest } = await supabase
      .from("roleplay_sessions")
      .select("score")
      .eq("user_id", sessionData.user_id)
      .eq("scenario_id", scenario_id)
      .eq("status", "completed")
      .neq("id", session_id)
      .order("score", { ascending: false })
      .limit(1)
      .single();

    const isNewBest = !previousBest || analysis.overall_score > (previousBest.score || 0);
    const isFirstCompletion = !previousBest;

    return new Response(
      JSON.stringify({
        ...analysis,
        is_new_best: isNewBest,
        is_first_completion: isFirstCompletion,
        previous_best: previousBest?.score || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Roleplay analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
