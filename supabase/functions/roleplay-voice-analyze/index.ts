import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisResult {
  addressed_objection: boolean;
  attempted_close: boolean;
  positive_momentum: boolean;
  win_conditions_achieved: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scenario_id, session_id, user_message, agent_message } = await req.json();

    if (!scenario_id || !session_id || !user_message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth check
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify session ownership
    const { data: sessionOwner } = await supabase
      .from("roleplay_sessions")
      .select("user_id")
      .eq("id", session_id)
      .maybeSingle();
    if (!sessionOwner || sessionOwner.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch scenario
    const { data: scenario, error: scenarioError } = await supabase
      .from("roleplay_scenarios")
      .select("win_conditions, objections_to_include")
      .eq("id", scenario_id)
      .maybeSingle();

    if (scenarioError || !scenario) throw new Error("Scenario not found");

    const winConditions: string[] = scenario.win_conditions ?? [];
    const objections: string[] = scenario.objections_to_include ?? [];

    const analysisPrompt = `Analyze this sales conversation exchange and return a JSON object.

Salesperson said: "${user_message}"
Prospect responded: "${agent_message ?? "(no response yet)"}"

Context - Win conditions for this scenario:
${winConditions.map((wc) => `- ${wc}`).join("\n")}

Objections that might be addressed:
${objections.map((obj) => `- ${obj}`).join("\n")}

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "addressed_objection": true/false (did salesperson address a known objection?),
  "attempted_close": true/false (did salesperson try to close or advance the sale?),
  "positive_momentum": true/false (did the prospect show positive buying signals?),
  "win_conditions_achieved": ["exact condition text from the list above"] (empty array if none)
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert sales coach analyzing conversations. Return only valid JSON." },
          { role: "user", content: analysisPrompt },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    let analysis: AnalysisResult = {
      addressed_objection: false,
      attempted_close: false,
      positive_momentum: false,
      win_conditions_achieved: [],
    };

    if (aiResponse.ok) {
      const data = await aiResponse.json();
      const text = data.choices?.[0]?.message?.content || "";
      try {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) analysis = JSON.parse(match[0]);
      } catch (e) {
        console.error("Failed to parse voice analysis:", e);
      }
    } else if (aiResponse.status === 429 || aiResponse.status === 402) {
      // Silently degrade — live tracking is best-effort
      return new Response(JSON.stringify({ analysis }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Voice analyze error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
