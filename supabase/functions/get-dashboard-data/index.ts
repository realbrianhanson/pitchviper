import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticatePost, corsHeaders, errorResponse, jsonResponse } from "../_shared/edgeAuth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await authenticatePost(req);
  if (!auth.ok) return auth.response;
  const { userId, serviceClient } = auth.ctx;

  try {
    const { data: profile } = await serviceClient
      .from("profiles").select("*, teams(id, name)").eq("user_id", userId).maybeSingle();

    const { data: todayStats } = await serviceClient
      .rpc("get_or_create_daily_stats", { p_user_id: userId });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const { data: yesterdayStats } = await serviceClient
      .from("daily_stats").select("*").eq("user_id", userId).eq("date", yesterdayStr).maybeSingle();

    let activitiesQuery = serviceClient
      .from("activities").select(`*, profiles:user_id(full_name, avatar_url)`)
      .order("created_at", { ascending: false }).limit(20);
    if (profile?.team_id) activitiesQuery = activitiesQuery.or(`user_id.eq.${userId},team_id.eq.${profile.team_id}`);
    else activitiesQuery = activitiesQuery.eq("user_id", userId);
    const { data: activities } = await activitiesQuery;

    const today = new Date().toISOString().split("T")[0];
    const { data: challenge } = await serviceClient
      .from("daily_challenges").select("*").eq("challenge_date", today).maybeSingle();

    let challengeProgress = null;
    if (challenge) {
      const { data: progress } = await serviceClient
        .from("user_challenge_progress").select("*")
        .eq("user_id", userId).eq("challenge_id", challenge.id).maybeSingle();
      challengeProgress = progress;
      if (!progress) {
        await serviceClient.from("user_challenge_progress")
          .insert({ user_id: userId, challenge_id: challenge.id, current_progress: 0 });
        challengeProgress = { current_progress: 0, completed: false };
      }
    }

    const { data: streak } = await serviceClient.rpc("calculate_streak", { p_user_id: userId });

    let teamLeaderboard = null;
    if (profile?.team_id) {
      const { data: teamMembers } = await serviceClient
        .from("profiles").select("user_id, full_name, avatar_url").eq("team_id", profile.team_id);
      if (teamMembers && teamMembers.length > 0) {
        const ids = teamMembers.map((m) => m.user_id);
        const { data: teamStats } = await serviceClient
          .from("daily_stats").select("*").eq("date", today).in("user_id", ids)
          .order("calls_made", { ascending: false }).limit(3);
        if (teamStats) {
          teamLeaderboard = teamStats.map((s, i) => {
            const m = teamMembers.find((x) => x.user_id === s.user_id);
            return { rank: i + 1, user_id: s.user_id, name: m?.full_name ?? "Unknown", avatar_url: m?.avatar_url, calls_made: s.calls_made, revenue_closed: s.revenue_closed };
          });
        }
      }
    }

    return jsonResponse({
      profile: {
        full_name: profile?.full_name, avatar_url: profile?.avatar_url, title: profile?.title,
        xp_points: profile?.xp_points ?? 0, current_level: profile?.current_level ?? 1,
        current_streak: streak ?? 0,
        team: profile?.teams ? { id: profile.teams.id, name: profile.teams.name } : null,
      },
      todayStats: todayStats ?? { calls_made: 0, calls_received: 0, appointments_set: 0, deals_closed: 0, deals_lost: 0, revenue_closed: 0, talk_time_minutes: 0 },
      yesterdayStats: yesterdayStats ?? null,
      activities: (activities ?? []).map((a) => ({
        id: a.id, type: a.activity_type, metadata: a.metadata, created_at: a.created_at,
        user: a.profiles ? { name: a.profiles.full_name, avatar_url: a.profiles.avatar_url } : null,
      })),
      challenge: challenge ? {
        id: challenge.id, title: challenge.title, description: challenge.description,
        type: challenge.challenge_type, target: challenge.target_value, xp_reward: challenge.xp_reward,
        progress: challengeProgress?.current_progress ?? 0, completed: challengeProgress?.completed ?? false,
      } : null,
      teamLeaderboard,
    });
  } catch (err) {
    console.error("[get-dashboard-data] internal_error");
    return errorResponse("internal_error", 500);
  }
});
