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

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const EXPECTED_CATEGORY_NAMES = [
  "Opening & Rapport",
  "Discovery Questions",
  "Objection Handling",
  "Value Presentation",
  "Closing Technique",
  "Conversation Control",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stripCodeFences = (value: string) => {
  const trimmed = value.trim();
  const fullFenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fullFenceMatch) {
    return fullFenceMatch[1].trim();
  }

  return trimmed.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
};

const extractJsonObject = (value: string) => {
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        start = i;
      }
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        return value.slice(start, i + 1);
      }
    }
  }

  return null;
};

const getStringArray = (value: unknown, fieldName: string) => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error(`Invalid ${fieldName} in analysis response`);
  }

  return value.map((item) => item.trim());
};

const parseAnalysisResponse = (rawContent: string): AnalysisResult => {
  const sanitized = stripCodeFences(rawContent);
  const jsonCandidate = extractJsonObject(sanitized) ?? sanitized;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonCandidate);
  } catch (error) {
    throw new Error(
      `Unable to parse model JSON: ${error instanceof Error ? error.message : "Unknown parse error"}`,
    );
  }

  if (!isRecord(parsed)) {
    throw new Error("Analysis response was not a JSON object");
  }

  const outcome = parsed.outcome;
  if (outcome !== "won" && outcome !== "lost" && outcome !== "progress") {
    throw new Error("Analysis response had an invalid outcome");
  }

  const overallScore = Number(parsed.overall_score);
  if (!Number.isFinite(overallScore)) {
    throw new Error("Analysis response had an invalid overall_score");
  }

  if (!Array.isArray(parsed.categories) || parsed.categories.length === 0) {
    throw new Error("Analysis response had no categories");
  }

  const categories = parsed.categories.map((category, index) => {
    if (!isRecord(category)) {
      throw new Error(`Category ${index + 1} was invalid`);
    }

    const name = typeof category.name === "string" && category.name.trim()
      ? category.name.trim()
      : EXPECTED_CATEGORY_NAMES[index] ?? `Category ${index + 1}`;
    const score = Number(category.score);
    const feedback = typeof category.feedback === "string" ? category.feedback.trim() : "";

    if (!Number.isFinite(score)) {
      throw new Error(`Category ${name} had an invalid score`);
    }

    if (!feedback) {
      throw new Error(`Category ${name} had empty feedback`);
    }

    return {
      name,
      score: Math.max(0, Math.min(100, Math.round(score))),
      feedback,
    };
  });

  const keyMoment = parsed.key_moment;
  if (!isRecord(keyMoment)) {
    throw new Error("Analysis response had an invalid key_moment");
  }

  const keyMomentType = keyMoment.type;
  const keyMomentDescription = typeof keyMoment.description === "string" ? keyMoment.description.trim() : "";
  if ((keyMomentType !== "highlight" && keyMomentType !== "missed_opportunity") || !keyMomentDescription) {
    throw new Error("Analysis response had an invalid key_moment payload");
  }

  return {
    outcome,
    overall_score: Math.max(0, Math.min(100, Math.round(overallScore))),
    categories,
    strengths: getStringArray(parsed.strengths, "strengths"),
    improvements: getStringArray(parsed.improvements, "improvements"),
    key_moment: {
      type: keyMomentType,
      description: keyMomentDescription,
    },
    xp_earned: 0,
  };
};

const extractAiMessageContent = (aiData: unknown) => {
  if (!isRecord(aiData)) return "";

  const choices = aiData.choices;
  if (!Array.isArray(choices) || choices.length === 0 || !isRecord(choices[0])) {
    return "";
  }

  const message = choices[0].message;
  if (!isRecord(message)) {
    return "";
  }

  const content = message.content;
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (isRecord(part) && typeof part.text === "string" ? part.text : ""))
      .join("")
      .trim();
  }

  return "";
};

const getFinishReason = (aiData: unknown) => {
  if (!isRecord(aiData)) return null;

  const choices = aiData.choices;
  if (!Array.isArray(choices) || choices.length === 0 || !isRecord(choices[0])) {
    return null;
  }

  const finishReason = choices[0].finish_reason;
  const nativeFinishReason = choices[0].native_finish_reason;

  return {
    finishReason: typeof finishReason === "string" ? finishReason : null,
    nativeFinishReason: typeof nativeFinishReason === "string" ? nativeFinishReason : null,
  };
};

const getRefusalMessage = (aiData: unknown) => {
  if (!isRecord(aiData)) return null;

  const choices = aiData.choices;
  if (!Array.isArray(choices) || choices.length === 0 || !isRecord(choices[0])) {
    return null;
  }

  const message = choices[0].message;
  if (!isRecord(message)) {
    return null;
  }

  const refusal = message.refusal;
  return typeof refusal === "string" && refusal.trim() ? refusal.trim() : null;
};

const requestAnalysis = async (LOVABLE_API_KEY: string, analysisPrompt: string) => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const retryInstruction = attempt === 1
      ? ""
      : "\n\nIMPORTANT: Your previous response was incomplete or not parseable. Return exactly one compact raw JSON object with no markdown fences, no commentary, no trailing text, and no extra keys.";

    try {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          response_format: { type: "json_object" },
          reasoning_effort: "none",
          messages: [
            {
              role: "system",
              content: "You are an expert sales coach. Return exactly one valid JSON object and nothing else. Do not include reasoning, markdown, or explanatory text.",
            },
            { role: "user", content: `${analysisPrompt}${retryInstruction}` },
          ],
          max_tokens: attempt === 1 ? 1200 : 1600,
          temperature: 0,
        }),
      });

      const rawBody = await aiResponse.text();
      console.log(`[roleplay-analyze] raw Gemini response attempt ${attempt}: ${rawBody}`);

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          throw new HttpError(429, "Rate limit exceeded. Please wait a moment and try again.");
        }
        if (aiResponse.status === 402) {
          throw new HttpError(402, "AI credits exhausted. Please add credits to continue.");
        }

        throw new Error(`AI analysis request failed with status ${aiResponse.status}: ${rawBody}`);
      }

      let aiData: unknown;
      try {
        aiData = JSON.parse(rawBody);
      } catch (error) {
        throw new Error(
          `AI gateway returned non-JSON response: ${error instanceof Error ? error.message : "Unknown parse error"}`,
        );
      }

      const refusalMessage = getRefusalMessage(aiData);
      if (refusalMessage) {
        throw new Error(`Model refusal: ${refusalMessage}`);
      }

      const finishReason = getFinishReason(aiData);
      if (finishReason?.finishReason === "length" || finishReason?.nativeFinishReason === "MAX_TOKENS") {
        throw new Error(
          `Model response truncated before completion (finish_reason=${finishReason.finishReason ?? "unknown"}, native_finish_reason=${finishReason.nativeFinishReason ?? "unknown"})`,
        );
      }

      const analysisText = extractAiMessageContent(aiData);
      console.log(`[roleplay-analyze] extracted Gemini content attempt ${attempt}: ${analysisText}`);

      if (!analysisText) {
        throw new Error(`AI response missing message content. Response shape: ${JSON.stringify(aiData)}`);
      }

      return parseAnalysisResponse(analysisText);
    } catch (error) {
      if (error instanceof HttpError && (error.status === 429 || error.status === 402)) {
        throw error;
      }

      lastError = error instanceof Error ? error : new Error("Unknown analysis failure");
      console.error(`[roleplay-analyze] analysis attempt ${attempt} failed:`, lastError);
    }
  }

  throw new HttpError(
    502,
    `Analysis failed after retry: ${lastError?.message ?? "Model returned an invalid response."}`,
  );
};

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
      .maybeSingle();

    if (scenarioError || !scenario) {
      throw new Error("Scenario not found");
    }

    // Fetch session: user_id + persisted transcript fallback
    const { data: sessionData, error: sessionError } = await supabase
      .from("roleplay_sessions")
      .select("user_id, transcript")
      .eq("id", session_id)
      .maybeSingle();

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

    const analysis = await requestAnalysis(LOVABLE_API_KEY, analysisPrompt);

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
      .maybeSingle();

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
      .maybeSingle();

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
    if (error instanceof HttpError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: error.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.error("Roleplay analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
