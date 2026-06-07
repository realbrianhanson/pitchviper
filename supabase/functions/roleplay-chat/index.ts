import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
}

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
    const { scenario_id, session_id, user_message, conversation_history } = await req.json();

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

    const { data: sessionOwner } = await supabase
      .from('roleplay_sessions')
      .select('user_id')
      .eq('id', session_id)
      .single();
    if (!sessionOwner || sessionOwner.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    // Fetch the salesperson's company settings for product context
    const { data: profile } = await supabase
      .from("profiles")
      .select("team_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    let companyContext = "";
    if (profile?.team_id) {
      const { data: companySettings } = await supabase
        .from("company_settings")
        .select("company_name, product_description, value_propositions, common_use_cases, industry, target_audience")
        .eq("team_id", profile.team_id)
        .maybeSingle();

      if (companySettings) {
        companyContext = `

PRODUCT/COMPANY THE SALESPERSON IS SELLING (this is what they will pitch to you — react to it realistically):
- Company: ${companySettings.company_name ?? "Unknown"}
${companySettings.industry ? `- Industry: ${companySettings.industry}\n` : ""}${companySettings.target_audience ? `- Target audience: ${companySettings.target_audience}\n` : ""}${companySettings.product_description ? `- Product: ${companySettings.product_description}\n` : ""}${Array.isArray(companySettings.value_propositions) && companySettings.value_propositions.length ? `- Value propositions: ${companySettings.value_propositions.join("; ")}\n` : ""}${Array.isArray(companySettings.common_use_cases) && companySettings.common_use_cases.length ? `- Common use cases: ${companySettings.common_use_cases.join("; ")}\n` : ""}`.trimEnd();
      }
    }

    // Build the system prompt
    const systemPrompt = `You are playing the role of a sales prospect in a realistic roleplay training scenario. Stay completely in character at all times.

CHARACTER PROFILE:
Name: ${getProspectName(scenario.name)}
Role: ${scenario.prospect_persona}

SITUATION:
${scenario.prospect_situation}
${companyContext}

YOUR BEHAVIOR GUIDELINES:
1. Stay 100% in character - never break character or acknowledge this is a roleplay
2. Be realistic but fair - you're not impossible to work with, but you have real concerns
3. Naturally weave in these objections during the conversation (don't use all at once):
${scenario.objections_to_include.map((obj: string) => `   - "${obj}"`).join("\n")}

4. Respond conversationally in 2-4 sentences typically
5. Show subtle positive signals when the salesperson addresses your concerns well
6. If they're doing really well, you can start showing buying signals
7. Be professional but human - you can show personality

WIN CONDITIONS (the salesperson is trying to achieve):
${scenario.win_conditions.map((wc: string) => `- ${wc}`).join("\n")}

If the salesperson successfully achieves a win condition through skilled conversation, acknowledge it naturally (e.g., "Alright, you've convinced me" or "Okay, let's schedule that call").

Remember: You're helping them practice, so be challenging but beatable with good sales technique.`;


    // Prepare messages for AI
    const messages: Message[] = [
      { role: "system", content: systemPrompt },
      ...conversation_history.map((msg: Message) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user", content: user_message },
    ];

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        max_tokens: 500,
        temperature: 0.8,
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
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error("Failed to get AI response");
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices?.[0]?.message?.content || "I'm sorry, I didn't catch that. Could you repeat?";

    // Run analysis on the conversation
    const analysisPrompt = `Analyze this sales conversation exchange and return a JSON object.

Salesperson said: "${user_message}"
Prospect responded: "${assistantMessage}"

Context - Win conditions for this scenario:
${scenario.win_conditions.map((wc: string) => `- ${wc}`).join("\n")}

Objections that might be addressed:
${scenario.objections_to_include.map((obj: string) => `- ${obj}`).join("\n")}

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "addressed_objection": true/false (did salesperson address a known objection?),
  "attempted_close": true/false (did salesperson try to close or advance the sale?),
  "positive_momentum": true/false (did the prospect show positive buying signals?),
  "win_conditions_achieved": ["condition text"] (list any win conditions that were achieved, empty array if none)
}`;

    const analysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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

    if (analysisResponse.ok) {
      const analysisData = await analysisResponse.json();
      const analysisText = analysisData.choices?.[0]?.message?.content || "";
      try {
        // Extract JSON from response (handle potential markdown code blocks)
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error("Failed to parse analysis:", e);
      }
    }

    // Atomically append both turns to the persisted transcript via SECURITY DEFINER RPC.
    // Replaces a read-modify-write that could overwrite the transcript with a partial
    // when the SELECT raced another in-flight chat call or returned no row.
    const timestamp = new Date().toISOString();
    const newMessages = [
      { role: "user", content: user_message, timestamp },
      { role: "assistant", content: assistantMessage, timestamp: new Date().toISOString() },
    ];

    const { error: appendError } = await supabase.rpc("append_roleplay_messages", {
      p_session_id: session_id,
      p_messages: newMessages,
    });

    if (appendError) {
      console.error("[roleplay-chat] failed to append transcript:", appendError);
    }

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        analysis,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Roleplay chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getProspectName(scenarioName: string): string {
  const names: Record<string, string> = {
    "The Hot Lead": "Alex Chen",
    "The Price Objector": "Morgan Williams",
    "The Tire Kicker": "Jordan Smith",
    "The Gatekeeper": "Taylor Martinez",
    "The Feature Demander": "Casey Johnson",
    "The Skeptical CFO": "Robin Anderson",
    "The Competitor Loyal": "Sam Thompson",
    "The Ghosted Follow-up": "Jamie Roberts",
  };
  return names[scenarioName] || "Chris Davis";
}
