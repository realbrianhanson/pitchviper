import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { scenario_id, agent_id } = await req.json();
    
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID");
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }
    
    if (!ELEVENLABS_AGENT_ID && !agent_id) {
      return new Response(
        JSON.stringify({ 
          error: "no_agent",
          message: "No ElevenLabs agent configured. Please add ELEVENLABS_AGENT_ID secret.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate user is authenticated
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get scenario details if provided
    let scenarioContext = "";
    if (scenario_id) {
      const { data: scenario } = await supabase
        .from("roleplay_scenarios")
        .select("name, prospect_persona, prospect_situation, objections_to_include, win_conditions")
        .eq("id", scenario_id)
        .single();

      if (scenario) {
        scenarioContext = `
Scenario: ${scenario.name}
Your persona: ${scenario.prospect_persona}
Your situation: ${scenario.prospect_situation}
Objections you should raise: ${scenario.objections_to_include.join(", ")}
Win conditions (salesperson goals): ${scenario.win_conditions.join(", ")}
        `.trim();
      }
    }

    // Use provided agent_id or fall back to configured secret
    const effectiveAgentId = agent_id || ELEVENLABS_AGENT_ID;
    
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${effectiveAgentId}`,
      {
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      // If no agent configured, return context for client-side agent creation prompt
      console.log("No ElevenLabs agent configured, returning scenario context for setup");
      return new Response(
        JSON.stringify({ 
          error: "no_agent",
          scenario_context: scenarioContext,
          message: "No ElevenLabs agent configured. Please set up an agent in the ElevenLabs dashboard.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { signed_url } = await response.json();

    return new Response(
      JSON.stringify({ 
        signed_url,
        scenario_context: scenarioContext,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ElevenLabs token error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
