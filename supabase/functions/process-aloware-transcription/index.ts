import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, isUuid, jsonResponse } from "../_shared/edgeAuth.ts";
import { boundedText, logAlowareEvent, readBoundedJson } from "../_shared/alowareSafe.ts";
import { timingSafeEqualStrings } from "../_shared/timingSafe.ts";
import { checkTeamEntitlementByTeamId } from "../_shared/entitlement.ts";

const MAX_TRANSCRIPT_CHARS = 200_000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("method_not_allowed", 405, { success: false });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!provided || !(await timingSafeEqualStrings(provided, serviceKey))) {
    return errorResponse("unauthorized", 401, { success: false });
  }

  const body = (await readBoundedJson(req, MAX_TRANSCRIPT_CHARS + 4096)) as Record<string, unknown> | null;
  if (!body) return errorResponse("invalid_body", 400, { success: false });

  const callId = typeof body.callId === "string" && isUuid(body.callId) ? body.callId : null;
  const transcription = boundedText(body.transcription, MAX_TRANSCRIPT_CHARS);
  if (!callId || !transcription) return errorResponse("invalid_args", 400, { success: false });

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: callRow } = await supabase
    .from("calls").select("team_id").eq("id", callId).maybeSingle();
  const _teamEnt = await checkTeamEntitlementByTeamId(supabase, callRow?.team_id ?? null, "starter");
  if (!_teamEnt.ok) {
    await logAlowareEvent(supabase, { event_type: "transcription_ignored", team_id: callRow?.team_id ?? null, processed: false, error_code: _teamEnt.code });
    return jsonResponse({ success: false, error: "subscription_required" }, 200);
  }

  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

  let analysis: Record<string, unknown> | null = null;
  if (lovableApiKey) {
    try {
      const analysisPrompt = `Analyze this sales call transcription and provide a structured analysis.

TRANSCRIPTION:
${transcription}

Provide your analysis in the following JSON format:
{
  "overall_score": <number 1-100>,
  "talk_to_listen_ratio": "<estimated percentage>",
  "objections_detected": [{"objection": "", "category": "price|timing|competition|authority|need|trust|stall", "handled_well": true, "response_used": ""}],
  "questions_asked": {"discovery_questions": 0, "closing_questions": 0, "quality": "weak|average|strong"},
  "buying_signals": [""],
  "red_flags": [""],
  "coaching_moments": [{"moment": "", "recommendation": ""}],
  "summary": ""
}`;
      const resp = await fetch("https://api.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableApiKey}` },
        body: JSON.stringify({
          model: "gpt-5-mini",
          messages: [
            { role: "system", content: "You are an expert sales coach. Respond with JSON only." },
            { role: "user", content: analysisPrompt },
          ],
          temperature: 0.3,
        }),
      });
      if (resp.ok) {
        const result = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = result.choices?.[0]?.message?.content ?? "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { analysis = JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
        }
      }
    } catch {
      // provider transient failure -> fall through to default analysis
    }
  }

  if (!analysis) {
    analysis = {
      overall_score: 50,
      talk_to_listen_ratio: "Unknown",
      objections_detected: [],
      questions_asked: { discovery_questions: 0, closing_questions: 0, quality: "unknown" },
      buying_signals: [],
      red_flags: [],
      coaching_moments: [],
      summary: "Transcription received but automated analysis unavailable.",
    };
  }

  const objectionsArr = Array.isArray(analysis.objections_detected) ? analysis.objections_detected : [];
  const objections = objectionsArr.map((o) => (o as { objection?: string }).objection).filter((s): s is string => !!s);

  const { error: updateError, count } = await supabase
    .from("calls")
    .update({
      self_rating: analysis.overall_score,
      struggled_objections: objections,
      improvement_notes: JSON.stringify({
        analysis_timestamp: new Date().toISOString(),
        talk_to_listen_ratio: analysis.talk_to_listen_ratio,
        questions_asked: analysis.questions_asked,
        buying_signals: analysis.buying_signals,
        red_flags: analysis.red_flags,
        coaching_moments: analysis.coaching_moments,
        summary: analysis.summary,
      }),
    }, { count: "exact" })
    .eq("id", callId);

  if (updateError || count === 0) {
    return errorResponse("call_update_failed", 500, { success: false });
  }

  await logAlowareEvent(supabase, {
    event_type: "transcription_analyzed",
    counters: { score: Number(analysis.overall_score) || 0, objections: objections.length },
  });

  return jsonResponse({
    success: true,
    analysis: {
      score: analysis.overall_score,
      summary: analysis.summary,
      objectionsCount: objections.length,
    },
  });
});
