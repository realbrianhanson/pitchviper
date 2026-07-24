// Single-finalize, idempotent roleplay analysis.
// The session is claimed atomically before any paid AI work; a repeated
// analyze on the same session returns the saved result without re-billing.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticatePost, boundedString, clampInt, corsHeaders, errorResponse, isUuid, jsonResponse } from "../_shared/edgeAuth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

const MAX_MESSAGES = 200;
const MAX_MESSAGE_CHARS = 5000;
const MAX_TOTAL_CHARS = 60000;

interface Msg { role: "user" | "assistant"; content: string }
interface ScoreCategory { name: string; score: number; feedback: string }
interface AnalysisResult {
  outcome: "won" | "lost" | "progress";
  overall_score: number;
  categories: ScoreCategory[];
  strengths: string[];
  improvements: string[];
  key_moment: { type: "highlight" | "missed_opportunity"; description: string };
  xp_earned: number;
}

const EXPECTED_CATEGORIES = [
  "Opening & Rapport", "Discovery Questions", "Objection Handling",
  "Value Presentation", "Closing Technique", "Conversation Control",
];

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function normalizeTranscript(input: unknown): Msg[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length > MAX_MESSAGES) return null;
  let total = 0;
  const out: Msg[] = [];
  for (const raw of input) {
    if (!isRecord(raw)) continue;
    const role = raw.role === "user" || raw.role === "assistant" ? raw.role : null;
    const content = typeof raw.content === "string" ? raw.content : "";
    if (!role || content.length === 0) continue;
    const trimmed = content.slice(0, MAX_MESSAGE_CHARS);
    total += trimmed.length;
    if (total > MAX_TOTAL_CHARS) return null;
    out.push({ role, content: trimmed });
  }
  return out;
}

function clampAnalysis(raw: unknown): AnalysisResult | null {
  if (!isRecord(raw)) return null;
  const outcome = raw.outcome === "won" || raw.outcome === "lost" || raw.outcome === "progress"
    ? raw.outcome : "progress";
  const overall_score = clampInt(raw.overall_score, 0, 100, 0);
  const cats = Array.isArray(raw.categories) ? raw.categories : [];
  const categories: ScoreCategory[] = EXPECTED_CATEGORIES.map((name, i) => {
    const c = isRecord(cats[i]) ? cats[i] as Record<string, unknown> : {};
    return {
      name: typeof c.name === "string" ? c.name : name,
      score: clampInt(c.score, 0, 100, 0),
      feedback: boundedString(c.feedback, 300) ?? "",
    };
  });
  const takeArr = (v: unknown, max: number): string[] =>
    Array.isArray(v) ? v.map((x) => boundedString(x, 300)).filter((s): s is string => !!s).slice(0, max) : [];
  const strengths = takeArr(raw.strengths, 5);
  const improvements = takeArr(raw.improvements, 5);
  const km = isRecord(raw.key_moment) ? raw.key_moment as Record<string, unknown> : {};
  const key_moment = {
    type: km.type === "highlight" || km.type === "missed_opportunity" ? km.type : "highlight" as const,
    description: boundedString(km.description, 600) ?? "",
  };
  return { outcome, overall_score, categories, strengths, improvements, key_moment, xp_earned: 0 };
}

function stripFences(s: string): string {
  const m = s.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (m ? m[1] : s).trim();
}

async function callAI(apiKey: string, prompt: string): Promise<AnalysisResult | null> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are an expert sales coach. Return exactly one JSON object with the requested shape and nothing else." },
        { role: "user", content: prompt },
      ],
      max_tokens: 2500,
      temperature: 0,
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new HttpError(429, "rate_limit");
    if (res.status === 402) throw new HttpError(402, "credits_exhausted");
    throw new HttpError(502, "ai_failed");
  }
  const data = await res.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? stripFences(content) : "";
  if (!text) return null;
  try { return clampAnalysis(JSON.parse(text)); } catch { return null; }
}

class HttpError extends Error { constructor(public status: number, public code: string) { super(code); } }

function computeXp(baseXp: number, outcome: string, score: number, hintsUsed: number): number {
  let xp = outcome === "won" ? baseXp
        : outcome === "progress" ? Math.floor(baseXp * 0.5)
        : Math.floor(baseXp * 0.25);
  if (score >= 90) xp = Math.floor(xp * 1.5);
  else if (score >= 80) xp = Math.floor(xp * 1.25);
  xp = Math.max(0, xp - clampInt(hintsUsed, 0, 20, 0) * 10);
  return xp;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authenticatePost(req);
  if (!auth.ok) return auth.response;
  const { userId, serviceClient } = auth.ctx;

  const rl = await enforceRateLimit(userId, "roleplay-analyze", { perMinute: 4, perDay: 40, serviceClient });
  if (!rl.allowed) return errorResponse("rate_limit", 429, { retry_after_seconds: rl.retryAfterSeconds });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return errorResponse("invalid_body", 400); }

  const sessionId = body.session_id;
  const scenarioId = body.scenario_id;
  if (!isUuid(sessionId) || !isUuid(scenarioId)) return errorResponse("invalid_ids", 400);

  const duration = clampInt(body.duration_seconds, 0, 24 * 3600, 0);
  const hintsUsed = clampInt(body.hints_used, 0, 20, 0);

  // Load session + verify ownership + scenario match server-side
  const { data: session, error: sessErr } = await serviceClient
    .from("roleplay_sessions")
    .select("id, user_id, scenario_id, status, score, feedback, duration_seconds, completed_at, transcript")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessErr) return errorResponse("session_lookup_failed", 500);
  if (!session || session.user_id !== userId) return errorResponse("session_not_found", 404);
  if (session.scenario_id !== scenarioId) return errorResponse("scenario_mismatch", 400);

  // Prefer persisted transcript over client-supplied
  const clientTranscript = normalizeTranscript(body.transcript) ?? [];
  const persisted = normalizeTranscript(session.transcript) ?? [];
  const transcript = persisted.length >= clientTranscript.length ? persisted : clientTranscript;
  if (transcript.length === 0 || !transcript.some((m) => m.role === "user")) {
    return errorResponse("empty_transcript", 400);
  }

  // Atomic claim
  const { data: claimData, error: claimErr } = await serviceClient.rpc("svc_claim_roleplay_analysis", {
    _session_id: sessionId,
    _user_id: userId,
  });
  if (claimErr || !claimData) return errorResponse("claim_failed", 500);
  const claim = claimData as { status: string; score?: number; feedback?: string };

  if (claim.status === "processing") return errorResponse("analysis_in_progress", 409);

  if (claim.status === "completed") {
    // Return the saved analysis untouched
    let saved: AnalysisResult | null = null;
    try { saved = claim.feedback ? JSON.parse(claim.feedback) as AnalysisResult : null; } catch { saved = null; }
    return jsonResponse({
      ...(saved ?? { outcome: "progress", overall_score: claim.score ?? 0, categories: [], strengths: [], improvements: [], key_moment: { type: "highlight", description: "" }, xp_earned: 0 }),
      already_completed: true,
    });
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    await serviceClient.rpc("svc_release_roleplay_claim", { _session_id: sessionId, _user_id: userId });
    return errorResponse("ai_not_configured", 503);
  }

  // Load scenario
  const { data: scenario, error: scErr } = await serviceClient
    .from("roleplay_scenarios")
    .select("name, difficulty, win_conditions, prospect_persona, prospect_situation, xp_reward")
    .eq("id", scenarioId)
    .maybeSingle();
  if (scErr || !scenario) {
    await serviceClient.rpc("svc_release_roleplay_claim", { _session_id: sessionId, _user_id: userId });
    return errorResponse("scenario_not_found", 404);
  }

  const transcriptText = transcript
    .map((m) => `${m.role === "user" ? "SALESPERSON" : "PROSPECT"}: ${m.content}`)
    .join("\n\n");

  const prompt = `You are an expert sales coach analyzing a roleplay training session.
SCENARIO: ${scenario.name}
DIFFICULTY: ${scenario.difficulty}
WIN CONDITIONS: ${(scenario.win_conditions ?? []).join(", ")}
PROSPECT PERSONA: ${scenario.prospect_persona}
SITUATION: ${scenario.prospect_situation}

TRANSCRIPT:
${transcriptText}

Return ONLY one JSON object with this shape:
{"outcome":"won|lost|progress","overall_score":0-100,"categories":[{"name":"Opening & Rapport","score":0-100,"feedback":""},{"name":"Discovery Questions","score":0-100,"feedback":""},{"name":"Objection Handling","score":0-100,"feedback":""},{"name":"Value Presentation","score":0-100,"feedback":""},{"name":"Closing Technique","score":0-100,"feedback":""},{"name":"Conversation Control","score":0-100,"feedback":""}],"strengths":["","",""],"improvements":["","",""],"key_moment":{"type":"highlight|missed_opportunity","description":""}}`;

  let analysis: AnalysisResult | null = null;
  try {
    analysis = await callAI(apiKey, prompt);
  } catch (e) {
    await serviceClient.rpc("svc_release_roleplay_claim", { _session_id: sessionId, _user_id: userId });
    if (e instanceof HttpError) return errorResponse(e.code, e.status);
    return errorResponse("ai_failed", 502);
  }
  if (!analysis) {
    await serviceClient.rpc("svc_release_roleplay_claim", { _session_id: sessionId, _user_id: userId });
    return errorResponse("ai_invalid_response", 502);
  }

  const xp = computeXp(scenario.xp_reward ?? 100, analysis.outcome, analysis.overall_score, hintsUsed);
  analysis.xp_earned = xp;

  const { data: finalData, error: finErr } = await serviceClient.rpc("svc_finalize_roleplay_analysis", {
    _session_id: sessionId,
    _user_id: userId,
    _outcome: analysis.outcome,
    _overall_score: analysis.overall_score,
    _feedback: analysis,
    _duration_seconds: duration,
    _xp_amount: xp,
    _scenario_name: scenario.name,
    _scenario_id: scenarioId,
  });
  if (finErr) {
    return errorResponse("finalize_failed", 500);
  }
  const finalized = finalData as { finalized: boolean; awarded: boolean; amount: number };

  // Best-score comparison (informational only)
  const { data: previousBest } = await serviceClient
    .from("roleplay_sessions")
    .select("score")
    .eq("user_id", userId)
    .eq("scenario_id", scenarioId)
    .eq("status", "completed")
    .neq("id", sessionId)
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();
  const isNewBest = !previousBest || analysis.overall_score > (previousBest.score ?? 0);
  const isFirstCompletion = !previousBest;

  return jsonResponse({
    ...analysis,
    xp_earned: finalized.awarded ? finalized.amount : 0,
    xp_award: { awarded: finalized.awarded, amount: finalized.amount },
    is_new_best: isNewBest,
    is_first_completion: isFirstCompletion,
    previous_best: previousBest?.score ?? null,
  });
});
