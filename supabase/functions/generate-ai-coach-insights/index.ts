import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RepInsight {
  user_id: string;
  full_name: string;
  metrics: {
    calls_30d: number;
    contacts_created_30d: number;
    opportunities_won_30d: number;
    stage_changes_30d: number;
    win_rate: number;
    roleplay_sessions_30d: number;
    avg_roleplay_score: number | null;
    best_roleplay_score: number | null;
  };
  whats_working: string;
  to_improve: string;
  weekly_focus: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const requestedUserIds: string[] = Array.isArray(body.user_ids) ? body.user_ids : [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

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
    const currentUserId = userData.user.id;

    // Resolve current user's role + team
    const [{ data: roleRow }, { data: meProfile }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", currentUserId).maybeSingle(),
      admin.from("profiles").select("user_id, full_name, team_id").eq("user_id", currentUserId).maybeSingle(),
    ]);
    const isManager = roleRow?.role === "manager";

    // Determine target user ids
    let targetIds: string[] = [];
    if (requestedUserIds.length > 0) {
      // Authorize: rep can only request themselves; manager can request team members
      if (isManager && meProfile?.team_id) {
        const { data: teammates } = await admin
          .from("profiles")
          .select("user_id")
          .eq("team_id", meProfile.team_id);
        const allowed = new Set((teammates ?? []).map((t) => t.user_id));
        targetIds = requestedUserIds.filter((id) => allowed.has(id) || id === currentUserId);
      } else {
        targetIds = requestedUserIds.filter((id) => id === currentUserId);
      }
    } else {
      // Default behavior: manager → all team members; rep → self
      if (isManager && meProfile?.team_id) {
        const { data: teammates } = await admin
          .from("profiles")
          .select("user_id")
          .eq("team_id", meProfile.team_id);
        targetIds = (teammates ?? []).map((t) => t.user_id);
      } else {
        targetIds = [currentUserId];
      }
    }

    if (targetIds.length === 0) {
      return new Response(JSON.stringify({ insights: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profiles + activity + roleplay data for all target users in parallel
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { data: profiles },
      { data: activities },
      { data: roleplays },
    ] = await Promise.all([
      admin
        .from("profiles")
        .select("user_id, full_name, title")
        .in("user_id", targetIds),
      admin
        .from("ghl_activities")
        .select("matched_user_id, event_type, value, occurred_at")
        .in("matched_user_id", targetIds)
        .gte("occurred_at", since),
      admin
        .from("roleplay_sessions")
        .select("user_id, score, status, completed_at")
        .in("user_id", targetIds)
        .eq("status", "completed")
        .gte("completed_at", since),
    ]);

    // Compute metrics per rep
    const metricsByUser = new Map<string, RepInsight["metrics"]>();
    for (const uid of targetIds) {
      const acts = (activities ?? []).filter((a) => a.matched_user_id === uid);
      const calls = acts.filter((a) => a.event_type === "call").length;
      const contactsCreated = acts.filter((a) => a.event_type === "contact_created").length;
      const won = acts.filter((a) => a.event_type === "opportunity_won").length;
      const stageChanges = acts.filter((a) => a.event_type === "opportunity_stage_changed").length;
      const opportunitiesTotal = won + stageChanges;
      const winRate = opportunitiesTotal > 0 ? Math.round((won / opportunitiesTotal) * 100) : 0;

      const reps = (roleplays ?? []).filter((r) => r.user_id === uid);
      const scores = reps.map((r) => r.score).filter((s): s is number => typeof s === "number");
      const avgRoleplay = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      const bestRoleplay = scores.length > 0 ? Math.max(...scores) : null;

      metricsByUser.set(uid, {
        calls_30d: calls,
        contacts_created_30d: contactsCreated,
        opportunities_won_30d: won,
        stage_changes_30d: stageChanges,
        win_rate: winRate,
        roleplay_sessions_30d: reps.length,
        avg_roleplay_score: avgRoleplay,
        best_roleplay_score: bestRoleplay,
      });
    }

    // Build a single AI prompt that batches all reps for efficiency
    const repBlocks = targetIds.map((uid) => {
      const p = profiles?.find((pr) => pr.user_id === uid);
      const m = metricsByUser.get(uid)!;
      return `Rep ID: ${uid}
Name: ${p?.full_name ?? "Unknown"}${p?.title ? ` (${p.title})` : ""}
30-day metrics:
- Calls made: ${m.calls_30d}
- New contacts created: ${m.contacts_created_30d}
- Pipeline stage changes: ${m.stage_changes_30d}
- Opportunities won: ${m.opportunities_won_30d}
- Win rate (won / pipeline moves): ${m.win_rate}%
- Roleplay sessions completed: ${m.roleplay_sessions_30d}
- Avg roleplay score: ${m.avg_roleplay_score ?? "n/a"}
- Best roleplay score: ${m.best_roleplay_score ?? "n/a"}`;
    }).join("\n\n---\n\n");

    const prompt = `You are a senior sales coach. For EACH rep below, write three short, plain-language coaching insights based purely on their numbers:
1. whats_working — one specific strength visible in the data (1 sentence)
2. to_improve — one specific gap or weak spot (1 sentence)
3. weekly_focus — ONE concrete thing they should focus on this week (1 sentence, actionable)

Be concrete and reference the numbers. If a rep has very little activity, say so honestly and recommend a baseline (e.g., "log 20 calls this week"). Avoid generic platitudes.

Reps:

${repBlocks}

Return ONLY valid JSON in this exact shape — no markdown, no commentary:
{
  "insights": [
    { "user_id": "<id>", "whats_working": "...", "to_improve": "...", "weekly_focus": "..." }
  ]
}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert sales coach. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        max_tokens: 1500,
        temperature: 0.4,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await aiResp.text();
      console.error("AI error:", aiResp.status, text);
      throw new Error("Failed to get AI insights");
    }

    const aiData = await aiResp.json();
    const aiText: string = aiData.choices?.[0]?.message?.content || "";
    let parsed: { insights: Array<{ user_id: string; whats_working: string; to_improve: string; weekly_focus: string }> } = { insights: [] };
    try {
      const match = aiText.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch (e) {
      console.error("Failed to parse AI JSON:", e, aiText);
    }

    // Merge AI insights with metrics + profile names
    const insights: RepInsight[] = targetIds.map((uid) => {
      const p = profiles?.find((pr) => pr.user_id === uid);
      const m = metricsByUser.get(uid)!;
      const ai = parsed.insights.find((i) => i.user_id === uid);
      return {
        user_id: uid,
        full_name: p?.full_name ?? "Unknown",
        metrics: m,
        whats_working: ai?.whats_working ?? "Not enough recent data to highlight a strength yet.",
        to_improve: ai?.to_improve ?? "Log more activity so we can surface specific gaps.",
        weekly_focus: ai?.weekly_focus ?? "Aim for a steady baseline of calls and at least one roleplay session.",
      };
    });

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-ai-coach-insights error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
