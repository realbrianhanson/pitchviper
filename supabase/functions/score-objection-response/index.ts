import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticatePost, boundedString, clampInt, corsHeaders, errorResponse, jsonResponse } from "../_shared/edgeAuth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

const CATEGORIES = new Set(["price", "authority", "need", "trust", "timing", "competitor", "product", "other"]);
const DIFFICULTIES = new Set(["easy", "medium", "hard", "beginner", "intermediate", "advanced"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authenticatePost(req);
  if (!auth.ok) return auth.response;
  const { userId, serviceClient } = auth.ctx;

  const rl = await enforceRateLimit(userId, "score-objection-response", { perMinute: 15, perDay: 200, serviceClient });
  if (!rl.allowed) return errorResponse("rate_limit", 429, { retry_after_seconds: rl.retryAfterSeconds });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return errorResponse("invalid_body", 400); }

  const objectionText = boundedString(body.objection_text, 1000);
  const userResponse = boundedString(body.user_response, 2000);
  const category = typeof body.category === "string" && CATEGORIES.has(body.category) ? body.category : "other";
  const difficulty = typeof body.difficulty === "string" && DIFFICULTIES.has(body.difficulty) ? body.difficulty : "medium";
  if (!objectionText || !userResponse) return errorResponse("invalid_fields", 400);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return errorResponse("ai_not_configured", 503);

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You evaluate a sales rep's response to a prospect objection. Category: ${category}. Difficulty: ${difficulty}. Consider: acknowledgement, not being defensive, clarifying questions, providing value, maintaining rapport.`,
        },
        {
          role: "user",
          content: `Objection: "${objectionText}"\nResponse: "${userResponse}"`,
        },
      ],
      tools: [{
        type: "function",
        function: {
          name: "evaluate_response",
          description: "Score the response",
          parameters: {
            type: "object",
            properties: {
              score: { type: "number", description: "0-100" },
              feedback: { type: "string", description: "2-3 sentences" },
              suggestedResponse: { type: "string", description: "Better response if score below 80" },
            },
            required: ["score", "feedback"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "evaluate_response" } },
    }),
  });

  if (!res.ok) {
    if (res.status === 429) return errorResponse("rate_limit", 429);
    if (res.status === 402) return errorResponse("credits_exhausted", 402);
    return errorResponse("ai_failed", 502);
  }

  const data = await res.json().catch(() => null);
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (typeof args !== "string") return errorResponse("ai_invalid_response", 502);

  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(args); } catch { return errorResponse("ai_invalid_response", 502); }

  const score = clampInt(parsed.score, 0, 100, 0);
  const feedback = boundedString(parsed.feedback, 800) ?? "Response evaluated.";
  const suggestedResponse = boundedString(parsed.suggestedResponse, 1000);

  return jsonResponse({
    score,
    feedback,
    suggestedResponse: score < 80 ? suggestedResponse : null,
  });
});
