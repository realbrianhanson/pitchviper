import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { requireTeamEntitlement } from "../_shared/entitlement.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scenario_id, agent_id } = await req.json();
    
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID");
    // Overrides are always returned. If the ElevenLabs agent has overrides disabled,
    // the client will surface an editorial error telling the manager to enable
    // "Security → Overrides" in the agent dashboard.
    
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

    // Validate caller's JWT — this endpoint mints signed URLs that burn ElevenLabs credits.
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Missing bearer token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const authedUserId = userData.user.id;

    // Rate-limit paid voice-token minting (per-user).
    const rl = await enforceRateLimit(authedUserId, 'elevenlabs-roleplay-token', { serviceClient: supabase });
    const _ent = await requireTeamEntitlement(supabase, authedUserId, "starter");
    if (!_ent.ok) return _ent.response;
    if (!rl.allowed) return rl.response!;

    // If scenario_id given, ensure it exists and is active (scenarios are shared, not per-user)
    if (scenario_id) {
      const { data: scenarioCheck } = await supabase
        .from("roleplay_scenarios")
        .select("id, is_active")
        .eq("id", scenario_id)
        .maybeSingle();
      if (!scenarioCheck || scenarioCheck.is_active === false) {
        return new Response(
          JSON.stringify({ error: "forbidden", message: "Scenario not available" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get scenario details if provided
    let scenarioContext = "";
    let agentPrompt = "";
    let firstMessage = "";
    let prospectName = "";

    let scenarioName = "";
    let scenarioDifficulty = "";

    if (scenario_id) {
      const { data: scenario } = await supabase
        .from("roleplay_scenarios")
        .select("name, difficulty, prospect_persona, prospect_situation, objections_to_include, win_conditions")
        .eq("id", scenario_id)
        .maybeSingle();

      if (scenario) {
        const nameMap: Record<string, string> = {
          "The Hot Lead": "Alex Chen",
          "The Price Objector": "Morgan Williams",
          "The Tire Kicker": "Jordan Smith",
          "The Gatekeeper": "Taylor Martinez",
          "The Feature Demander": "Casey Johnson",
          "The Skeptical CFO": "Robin Anderson",
          "The Competitor Loyal": "Sam Thompson",
          "The Ghosted Follow-up": "Jamie Roberts",
        };
        prospectName = nameMap[scenario.name] ?? "Chris Davis";
        scenarioName = scenario.name ?? "";
        scenarioDifficulty = (scenario as any).difficulty ?? "";

        // Enrich with the caller's company settings for product context
        let companyContext = "";
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("team_id")
            .eq("user_id", authedUserId)
            .maybeSingle();
          if (profile?.team_id) {
            const { data: cs } = await supabase
              .from("company_settings")
              .select("company_name, product_description, value_propositions, common_use_cases, industry, target_audience")
              .eq("team_id", profile.team_id)
              .maybeSingle();
            if (cs) {
              companyContext = `

PRODUCT/COMPANY THE SALESPERSON IS SELLING (react to it realistically):
- Company: ${cs.company_name ?? "Unknown"}
${cs.industry ? `- Industry: ${cs.industry}\n` : ""}${cs.target_audience ? `- Target audience: ${cs.target_audience}\n` : ""}${cs.product_description ? `- Product: ${cs.product_description}\n` : ""}${Array.isArray(cs.value_propositions) && cs.value_propositions.length ? `- Value propositions: ${cs.value_propositions.join("; ")}\n` : ""}${Array.isArray(cs.common_use_cases) && cs.common_use_cases.length ? `- Common use cases: ${cs.common_use_cases.join("; ")}\n` : ""}`.trimEnd();
            }
          }
        } catch (e) {
          console.error("company_settings lookup failed:", e);
        }

        scenarioContext = `
Scenario: ${scenario.name}
Your persona: ${scenario.prospect_persona}
Your situation: ${scenario.prospect_situation}
Objections you should raise: ${scenario.objections_to_include.join(", ")}
Win conditions (salesperson goals): ${scenario.win_conditions.join(", ")}
        `.trim();

        agentPrompt = `You ARE ${prospectName}, the prospect being called by a salesperson. Stay in character as the prospect at all times; never act as the salesperson, coach, or assistant. The human on the other end of this call is the salesperson — you are the one they are trying to sell to. Never break character or acknowledge this is a roleplay.

CHARACTER PROFILE:
Name: ${prospectName}
Role: ${scenario.prospect_persona}

SITUATION:
${scenario.prospect_situation}
${companyContext}

BEHAVIOR:
- Be realistic but fair — challenging but beatable with good sales technique.
- Speak conversationally in 1-3 short sentences typical for a phone call. Use natural fillers occasionally.
- Naturally weave in these objections over the course of the call (don't dump them all at once):
${scenario.objections_to_include.map((o: string) => `  • "${o}"`).join("\n")}
- Show subtle positive signals when the salesperson handles a concern well. If they're doing great, start showing buying signals.

WIN CONDITIONS the salesperson is trying to achieve:
${scenario.win_conditions.map((w: string) => `- ${w}`).join("\n")}
If they earn one through skilled conversation, acknowledge it naturally ("Alright, you've convinced me", "Okay, let's schedule that").`;

        firstMessage = `Hello, this is ${prospectName}.`;
      }
    }


    // Use provided agent_id or fall back to configured secret
    const effectiveAgentId = agent_id || ELEVENLABS_AGENT_ID;
    
    console.log("Using agent ID:", effectiveAgentId ? effectiveAgentId.substring(0, 8) + "..." : "none");
    
    const tokenResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${effectiveAgentId}`,
      {
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    let conversationToken = "";
    let signedUrl = "";

    if (tokenResponse.ok) {
      const body = await tokenResponse.json();
      conversationToken = typeof body?.token === "string" ? body.token : "";
    } else {
      const tokenErrorText = await tokenResponse.text();
      console.error("ElevenLabs WebRTC token error:", tokenResponse.status, tokenErrorText);

      const signedUrlResponse = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${effectiveAgentId}`,
        {
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
          },
        }
      );

      if (!signedUrlResponse.ok) {
        const signedUrlErrorText = await signedUrlResponse.text();
        console.error("ElevenLabs signed URL error:", signedUrlResponse.status, signedUrlErrorText);
        
        // Return more specific error info
        return new Response(
          JSON.stringify({ 
            error: "api_error",
            status: signedUrlResponse.status,
            message: `ElevenLabs API error: ${signedUrlResponse.status}. Please verify your Agent ID is correct.`,
            details: signedUrlErrorText,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await signedUrlResponse.json();
      signedUrl = typeof body?.signed_url === "string" ? body.signed_url : "";
    }

    return new Response(
      JSON.stringify({
        conversation_token: conversationToken,
        signed_url: signedUrl,
        connection_type: conversationToken ? "webrtc" : "websocket",
        scenario_context: scenarioContext,
        prospect_name: prospectName,
        scenario_name: scenarioName,
        difficulty: scenarioDifficulty,
        agent_prompt: agentPrompt,
        first_message: firstMessage,
        dynamic_variables: {
          prospect_name: prospectName,
          scenario_name: scenarioName,
          difficulty: scenarioDifficulty,
        },
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
