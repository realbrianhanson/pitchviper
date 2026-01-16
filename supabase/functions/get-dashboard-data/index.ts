import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Get user profile with team info
    const { data: profile } = await supabase
      .from("profiles")
      .select("*, teams(id, name)")
      .eq("user_id", userId)
      .single();

    // Get or create today's stats
    const { data: todayStats } = await supabase
      .rpc("get_or_create_daily_stats", { p_user_id: userId });

    // Get yesterday's stats for comparison
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const { data: yesterdayStats } = await supabase
      .from("daily_stats")
      .select("*")
      .eq("user_id", userId)
      .eq("date", yesterdayStr)
      .single();

    // Get recent activities (own + team)
    let activitiesQuery = supabase
      .from("activities")
      .select(`
        *,
        profiles:user_id(full_name, avatar_url)
      `)
      .order("created_at", { ascending: false })
      .limit(20);

    if (profile?.team_id) {
      activitiesQuery = activitiesQuery.or(`user_id.eq.${userId},team_id.eq.${profile.team_id}`);
    } else {
      activitiesQuery = activitiesQuery.eq("user_id", userId);
    }

    const { data: activities } = await activitiesQuery;

    // Get today's challenge
    const today = new Date().toISOString().split("T")[0];
    const { data: challenge } = await supabase
      .from("daily_challenges")
      .select("*")
      .eq("challenge_date", today)
      .single();

    // Get user's challenge progress
    let challengeProgress = null;
    if (challenge) {
      const { data: progress } = await supabase
        .from("user_challenge_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("challenge_id", challenge.id)
        .single();

      challengeProgress = progress;

      // Create progress record if doesn't exist
      if (!progress) {
        await supabase
          .from("user_challenge_progress")
          .insert({
            user_id: userId,
            challenge_id: challenge.id,
            current_progress: 0,
          });
        challengeProgress = { current_progress: 0, completed: false };
      }
    }

    // Calculate streak
    const { data: streak } = await supabase
      .rpc("calculate_streak", { p_user_id: userId });

    // Get team leaderboard (top 3 today)
    let teamLeaderboard = null;
    if (profile?.team_id) {
      // Get team members
      const { data: teamMembers } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .eq("team_id", profile.team_id);

      if (teamMembers && teamMembers.length > 0) {
        const teamUserIds = teamMembers.map(m => m.user_id);
        
        const { data: teamStats } = await supabase
          .from("daily_stats")
          .select("*")
          .eq("date", today)
          .in("user_id", teamUserIds)
          .order("calls_made", { ascending: false })
          .limit(3);

        if (teamStats) {
          teamLeaderboard = teamStats.map((stat, index) => {
            const member = teamMembers.find(m => m.user_id === stat.user_id);
            return {
              rank: index + 1,
              user_id: stat.user_id,
              name: member?.full_name || "Unknown",
              avatar_url: member?.avatar_url,
              calls_made: stat.calls_made,
              revenue_closed: stat.revenue_closed,
            };
          });
        }
      }
    }

    // Prepare response
    const response = {
      profile: {
        full_name: profile?.full_name,
        avatar_url: profile?.avatar_url,
        title: profile?.title,
        xp_points: profile?.xp_points || 0,
        current_level: profile?.current_level || 1,
        current_streak: streak || 0,
        team: profile?.teams ? { id: profile.teams.id, name: profile.teams.name } : null,
      },
      todayStats: todayStats || {
        calls_made: 0,
        calls_received: 0,
        appointments_set: 0,
        deals_closed: 0,
        deals_lost: 0,
        revenue_closed: 0,
        talk_time_minutes: 0,
      },
      yesterdayStats: yesterdayStats || null,
      activities: activities?.map(a => ({
        id: a.id,
        type: a.activity_type,
        metadata: a.metadata,
        created_at: a.created_at,
        user: a.profiles ? {
          name: a.profiles.full_name,
          avatar_url: a.profiles.avatar_url,
        } : null,
      })) || [],
      challenge: challenge ? {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        type: challenge.challenge_type,
        target: challenge.target_value,
        xp_reward: challenge.xp_reward,
        progress: challengeProgress?.current_progress || 0,
        completed: challengeProgress?.completed || false,
      } : null,
      teamLeaderboard,
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (err) {
    const error = err as Error;
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});