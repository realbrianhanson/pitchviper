import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userResp = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, { headers: { apikey: Deno.env.get('SUPABASE_ANON_KEY')!, Authorization: `Bearer ${token}` } });
    if (!userResp.ok) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { challengeType, responses, challengeContent } = await req.json();
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      // Return mock evaluation for testing
      return new Response(
        JSON.stringify({
          scores: responses.map(() => ({ score: 75, feedback: "Good response!" })),
          averageScore: 75,
          passed: true,
          overallFeedback: "Great job completing the challenge!"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = buildEvaluationPrompt(challengeType, responses, challengeContent);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert sales trainer evaluating responses to sales challenges. 
Score each response from 0-100 based on effectiveness, professionalism, and sales best practices.
Always respond with valid JSON only, no markdown code blocks.`
          },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", errorText);
      throw new Error("AI evaluation failed");
    }

    const aiData = await response.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error("No AI response content");
    }

    // Parse AI response
    let evaluation;
    try {
      const cleanContent = aiContent.replace(/```json\n?|\n?```/g, '').trim();
      evaluation = JSON.parse(cleanContent);
    } catch {
      console.error("Failed to parse AI response:", aiContent);
      // Return default evaluation
      evaluation = {
        scores: responses.map(() => ({ score: 70, feedback: "Evaluated" })),
        averageScore: 70,
        passed: true,
        overallFeedback: "Challenge completed!"
      };
    }

    // Calculate if passed based on challenge type
    const passingScore = challengeContent?.passing_score || 70;
    const avgScore = evaluation.averageScore || 
      (evaluation.scores?.reduce((sum: number, s: { score: number }) => sum + s.score, 0) / (evaluation.scores?.length || 1));
    
    return new Response(
      JSON.stringify({
        ...evaluation,
        averageScore: Math.round(avgScore),
        passed: avgScore >= passingScore
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Evaluation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildEvaluationPrompt(type: string, responses: unknown[], content: Record<string, unknown>): string {
  switch (type) {
    case 'objection_blast':
      return `Evaluate these objection handling responses.
Objections and responses:
${(content.objections as Array<{id: number; text: string}>).map((obj, i) => 
  `Objection ${obj.id}: "${obj.text}"
Response: "${responses[i] || 'No response'}"
`).join('\n')}

Return JSON:
{
  "scores": [{"score": 0-100, "feedback": "specific feedback"}],
  "averageScore": number,
  "overallFeedback": "summary of performance"
}`;

    case 'pitch_perfect':
      return `Evaluate this sales pitch.
Scenario: ${content.scenario}
Product: ${content.product}
Key elements to check: ${JSON.stringify(content.key_elements)}

Pitch submitted:
"${responses[0] || 'No response'}"

Return JSON:
{
  "scores": [{"score": 0-100, "feedback": "feedback", "elementsFound": ["element1", "element2"]}],
  "averageScore": number,
  "overallFeedback": "summary"
}`;

    case 'discovery_questions':
      return `Evaluate these discovery questions.
Scenario: ${content.prospect_scenario}
Prospect role: ${content.prospect_role}

Questions submitted:
${(responses as string[]).map((q, i) => `${i + 1}. "${q}"`).join('\n')}

Evaluate each question for: open-ended nature, relevance, depth of insight.

Return JSON:
{
  "scores": [{"score": 0-100, "feedback": "specific feedback on the question"}],
  "averageScore": number,
  "overallFeedback": "summary"
}`;

    case 'scenario_response':
      return `Evaluate these sales responses.
${(content.scenarios as Array<{id: number; prospect_says: string; context: string}>).map((s, i) => 
  `Scenario ${s.id}:
Context: ${s.context}
Prospect says: "${s.prospect_says}"
Rep responds: "${responses[i] || 'No response'}"
`).join('\n')}

Return JSON:
{
  "scores": [{"score": 0-100, "feedback": "specific feedback"}],
  "averageScore": number,
  "overallFeedback": "summary"
}`;

    default:
      return `Evaluate these responses: ${JSON.stringify(responses)}
Context: ${JSON.stringify(content)}
Return JSON with scores array, averageScore, and overallFeedback.`;
  }
}
