// Server-scored, server-written gauntlet evaluation.
// Client never supplies challenge content, passing score, or completion rows.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticatePost, boundedString, clampInt, corsHeaders, errorResponse, isUuid, jsonResponse } from "../_shared/edgeAuth.ts";
import { requireTeamEntitlement } from "../_shared/entitlement.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

const MAX_RESPONSES = 12;
const MAX_RESPONSE_CHARS = 2000;
const MAX_TOTAL_CHARS = 8000;

interface ScoreItem { score: number; feedback: string }
interface Evaluation {
  scores: ScoreItem[];
  averageScore: number;
  passed: boolean;
  overallFeedback: string;
}

function normalizeResponses(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length === 0 || input.length > MAX_RESPONSES) return null;
  const out: string[] = [];
  let total = 0;
  for (const raw of input) {
    const s = typeof raw === "string" ? raw : raw == null ? "" : String(raw);
    const trimmed = s.slice(0, MAX_RESPONSE_CHARS);
    total += trimmed.length;
    if (total > MAX_TOTAL_CHARS) return null;
    out.push(trimmed);
  }
  return out;
}

function clampScoreItem(raw: unknown, fallback: string): ScoreItem {
  const obj = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const score = clampInt(obj.score, 0, 100, 0);
  const feedback = boundedString(obj.feedback, 400) ?? fallback;
  return { score, feedback };
}

function buildPrompt(type: string, responses: string[], content: Record<string, unknown>): string {
  const rlist = responses.map((r, i) => `${i + 1}. "${r || "(empty)"}"`).join("\n");
  const contentText = JSON.stringify(content).slice(0, 4000);
  return `You are an expert sales trainer.
Challenge type: ${type}
Challenge content (JSON): ${contentText}
Rep responses:
${rlist}

Return ONLY a valid JSON object with this exact shape (no markdown, no commentary):
{"scores":[{"score":0-100,"feedback":"one-sentence feedback"}],"averageScore":0-100,"overallFeedback":"1-2 sentences"}
Provide exactly one score entry per response, in the same order.`;
}

async function callGateway(apiKey: string, prompt: string): Promise<Evaluation | null> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You evaluate sales challenge responses. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 1200,
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new HttpError(429, "rate_limit");
    if (res.status === 402) throw new HttpError(402, "credits_exhausted");
    throw new HttpError(502, "ai_failed");
  }
  const data = await res.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return null;
  try {
    const cleaned = content.replace(/```json\s*|```/gi, "").trim();
    const parsed = JSON.parse(cleaned);
    return parsed as Evaluation;
  } catch {
    return null;
  }
}

class HttpError extends Error { constructor(public status: number, public code: string) { super(code); } }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authenticatePost(req);
  if (!auth.ok) return auth.response;
  const { userId, serviceClient } = auth.ctx;

  const ent = await requireTeamEntitlement(serviceClient, userId, "growth");
  if (!ent.ok) return ent.response;

  const rl = await enforceRateLimit(userId, "evaluate-gauntlet", { perMinute: 6, perDay: 60, serviceClient });
  if (!rl.allowed) return rl.response!;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid_body", 400);
  }

  const action = body.action === "skip" ? "skip" : "evaluate";
  const challengeId = body.challengeId;
  if (!isUuid(challengeId)) return errorResponse("invalid_challenge", 400);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");

  // Load challenge server-side (never trust client for content/passing score)
  const { data: challenge, error: challengeErr } = await serviceClient
    .from("gauntlet_challenges")
    .select("id, challenge_type, content, xp_reward")
    .eq("id", challengeId)
    .maybeSingle();
  if (challengeErr || !challenge) return errorResponse("challenge_not_found", 404);

  const content = (challenge.content ?? {}) as Record<string, unknown>;
  const passingScore = clampInt(content?.passing_score, 0, 100, 70);

  if (action === "skip") {
    const { error: upErr } = await serviceClient.rpc("svc_upsert_gauntlet_completion", {
      _user_id: userId,
      _challenge_id: challengeId,
      _score: 0,
      _passed: false,
      _responses: {},
      _feedback: { skipped: true },
      _skipped: true,
    });
    if (upErr) return errorResponse("persist_failed", 500);
    return jsonResponse({ skipped: true });
  }

  // Idempotency: if already passed, return saved result without paying for AI again
  const { data: existing } = await serviceClient
    .from("user_gauntlet_completions")
    .select("id, score, passed, feedback")
    .eq("user_id", userId)
    .eq("challenge_id", challengeId)
    .maybeSingle();
  if (existing?.passed) {
    const fb = (existing.feedback ?? {}) as Partial<Evaluation>;
    return jsonResponse({
      scores: Array.isArray(fb.scores) ? fb.scores : [],
      averageScore: clampInt(existing.score, 0, 100, 0),
      passed: true,
      overallFeedback: typeof fb.overallFeedback === "string" ? fb.overallFeedback : "Already completed.",
      completion_id: existing.id,
      xp_award: { awarded: false, amount: 0 },
      already_completed: true,
    });
  }

  if (!apiKey) return errorResponse("ai_not_configured", 503);

  const responses = normalizeResponses(body.responses);
  if (!responses) return errorResponse("invalid_responses", 400);

  let evaluation: Evaluation | null;
  try {
    evaluation = await callGateway(apiKey, buildPrompt(String(challenge.challenge_type), responses, content));
  } catch (e) {
    if (e instanceof HttpError) return errorResponse(e.code, e.status);
    return errorResponse("ai_failed", 502);
  }
  if (!evaluation) return errorResponse("ai_invalid_response", 502);

  // Validate/clamp AI output — never trust it blindly.
  const rawScores = Array.isArray(evaluation.scores) ? evaluation.scores : [];
  const scores = responses.map((_, i) => clampScoreItem(rawScores[i], "Response recorded."));
  const avg = Math.round(scores.reduce((s, i) => s + i.score, 0) / (scores.length || 1));
  const passed = avg >= passingScore;
  const overallFeedback = boundedString(evaluation.overallFeedback, 800) ?? "Challenge evaluated.";

  const clean: Evaluation = { scores, averageScore: avg, passed, overallFeedback };

  const { data: upserted, error: upErr } = await serviceClient.rpc("svc_upsert_gauntlet_completion", {
    _user_id: userId,
    _challenge_id: challengeId,
    _score: avg,
    _passed: passed,
    _responses: responses,
    _feedback: clean,
    _skipped: false,
  });
  if (upErr || !upserted) return errorResponse("persist_failed", 500);
  const completionId = (upserted as { id: string }).id;

  // Award XP through the caller's authenticated context so award_event_xp
  // sees auth.uid() and enforces its own ownership check.
  let xpAward: { awarded: boolean; amount: number } = { awarded: false, amount: 0 };
  if (passed) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = (await import("https://esm.sh/@supabase/supabase-js@2")).createClient(
      supabaseUrl,
      anonKey,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: awardData } = await authClient.rpc("award_event_xp", {
      _reason: "gauntlet_passed",
      _source_id: completionId,
    });
    if (awardData && typeof awardData === "object") {
      const d = awardData as { awarded?: boolean; amount?: number };
      xpAward = { awarded: !!d.awarded, amount: clampInt(d.amount, 0, 10000, 0) };
    }
  }

  return jsonResponse({ ...clean, completion_id: completionId, xp_award: xpAward });
});
