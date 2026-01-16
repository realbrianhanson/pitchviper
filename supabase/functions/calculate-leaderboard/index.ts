import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  title: string | null;
  team_name: string | null;
  current_level: number;
  value: number;
  trend: 'up' | 'down' | 'same';
  previous_rank?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { metric_type, time_period, team_id } = await req.json();

    // Calculate date ranges
    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    switch (time_period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        previousEndDate = new Date(startDate);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        previousEndDate = new Date(startDate);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEndDate = new Date(startDate);
        break;
      case 'all_time':
      default:
        startDate = new Date(0);
        previousStartDate = new Date(0);
        previousEndDate = new Date(0);
        break;
    }

    let leaderboardData: LeaderboardEntry[] = [];

    // Fetch profiles with team info
    let profilesQuery = supabase
      .from('profiles')
      .select(`
        user_id,
        full_name,
        avatar_url,
        title,
        current_level,
        xp_points,
        team_id,
        teams:team_id (name)
      `);

    if (team_id) {
      profilesQuery = profilesQuery.eq('team_id', team_id);
    }

    const { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError) {
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ leaderboard: [], userRank: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate metrics based on type
    for (const profile of profiles) {
      let value = 0;
      let previousValue = 0;

      switch (metric_type) {
        case 'calls': {
          const { count } = await supabase
            .from('calls')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.user_id)
            .gte('created_at', startDate.toISOString());
          value = count || 0;

          if (time_period !== 'all_time') {
            const { count: prevCount } = await supabase
              .from('calls')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', profile.user_id)
              .gte('created_at', previousStartDate.toISOString())
              .lt('created_at', previousEndDate.toISOString());
            previousValue = prevCount || 0;
          }
          break;
        }
        case 'appointments': {
          const { count } = await supabase
            .from('calls')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.user_id)
            .not('appointment_scheduled_at', 'is', null)
            .gte('created_at', startDate.toISOString());
          value = count || 0;

          if (time_period !== 'all_time') {
            const { count: prevCount } = await supabase
              .from('calls')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', profile.user_id)
              .not('appointment_scheduled_at', 'is', null)
              .gte('created_at', previousStartDate.toISOString())
              .lt('created_at', previousEndDate.toISOString());
            previousValue = prevCount || 0;
          }
          break;
        }
        case 'revenue': {
          const { data: deals } = await supabase
            .from('calls')
            .select('deal_value')
            .eq('user_id', profile.user_id)
            .not('deal_value', 'is', null)
            .gte('created_at', startDate.toISOString());
          value = deals?.reduce((sum, d) => sum + (Number(d.deal_value) || 0), 0) || 0;

          if (time_period !== 'all_time') {
            const { data: prevDeals } = await supabase
              .from('calls')
              .select('deal_value')
              .eq('user_id', profile.user_id)
              .not('deal_value', 'is', null)
              .gte('created_at', previousStartDate.toISOString())
              .lt('created_at', previousEndDate.toISOString());
            previousValue = prevDeals?.reduce((sum, d) => sum + (Number(d.deal_value) || 0), 0) || 0;
          }
          break;
        }
        case 'roleplay': {
          const { data: sessions } = await supabase
            .from('roleplay_sessions')
            .select('score')
            .eq('user_id', profile.user_id)
            .eq('status', 'completed')
            .not('score', 'is', null)
            .gte('started_at', startDate.toISOString());
          
          if (sessions && sessions.length > 0) {
            value = Math.round(sessions.reduce((sum, s) => sum + (s.score || 0), 0) / sessions.length);
          }
          break;
        }
        case 'xp': {
          // For XP, we use the current XP points from profile
          value = profile.xp_points || 0;
          break;
        }
        case 'overall':
        default: {
          // Combined score: calls * 1 + appointments * 10 + (revenue/100) + roleplay_avg + xp/10
          const { count: callCount } = await supabase
            .from('calls')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.user_id)
            .gte('created_at', startDate.toISOString());
          
          const { count: apptCount } = await supabase
            .from('calls')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.user_id)
            .not('appointment_scheduled_at', 'is', null)
            .gte('created_at', startDate.toISOString());
          
          const { data: deals } = await supabase
            .from('calls')
            .select('deal_value')
            .eq('user_id', profile.user_id)
            .not('deal_value', 'is', null)
            .gte('created_at', startDate.toISOString());
          
          const revenue = deals?.reduce((sum, d) => sum + (Number(d.deal_value) || 0), 0) || 0;
          
          value = (callCount || 0) + ((apptCount || 0) * 10) + Math.floor(revenue / 100) + Math.floor((profile.xp_points || 0) / 10);
          break;
        }
      }

      const teamData = profile.teams as unknown as { name: string } | null;

      leaderboardData.push({
        rank: 0,
        user_id: profile.user_id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        title: profile.title,
        team_name: teamData?.name || null,
        current_level: profile.current_level,
        value,
        trend: previousValue > value ? 'down' : previousValue < value ? 'up' : 'same',
      });
    }

    // Sort by value descending and assign ranks
    leaderboardData.sort((a, b) => b.value - a.value);
    leaderboardData.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return new Response(JSON.stringify({ 
      leaderboard: leaderboardData,
      generated_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error calculating leaderboard:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});