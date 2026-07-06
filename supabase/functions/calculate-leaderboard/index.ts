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
  xp_points: number;
  value: number;
  trend: 'up' | 'down' | 'same';
}

interface Profile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  title: string | null;
  current_level: number;
  xp_points: number;
  team_id: string | null;
}

function getStartOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function calculateDateRanges(timePeriod: string): { start: Date; prevStart: Date; prevEnd: Date } {
  const now = new Date();
  const today = getStartOfDay(now);

  let start: Date;
  let prevStart: Date;
  let prevEnd: Date;

  switch (timePeriod) {
    case 'today':
      start = new Date(today);
      prevStart = new Date(today);
      prevStart.setDate(prevStart.getDate() - 1);
      prevEnd = new Date(today);
      break;
    case 'week': {
      const dayIdx = (now.getDay() + 6) % 7; // Monday = 0
      start = new Date(today);
      start.setDate(today.getDate() - dayIdx);
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 7);
      prevEnd = new Date(start);
      break;
    }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(start);
      break;
    case 'all_time':
    default:
      start = new Date(0);
      prevStart = new Date(0);
      prevEnd = new Date(0);
      break;
  }

  return { start, prevStart, prevEnd };
}

function aggregateMetrics(activities: any[], metricType: string): number {
  if (!activities || activities.length === 0) return 0;

  switch (metricType) {
    case 'calls':
      return activities.filter(a => a.event_type === 'call').length;
    case 'deals_won':
      return activities.filter(a => a.event_type === 'opportunity_won').length;
    case 'revenue':
      return activities
        .filter(a => a.event_type === 'opportunity_won')
        .reduce((sum, a) => sum + (Number(a.value) || 0), 0);
    case 'contacts':
      return activities.filter(a => a.event_type === 'contact_created').length;
    case 'pipeline':
      return activities.filter(a => a.event_type === 'opportunity_stage_changed').length;
    case 'overall':
    default: {
      const calls = activities.filter(a => a.event_type === 'call').length;
      const dealsWon = activities.filter(a => a.event_type === 'opportunity_won').length;
      const revenue = activities
        .filter(a => a.event_type === 'opportunity_won')
        .reduce((sum, a) => sum + (Number(a.value) || 0), 0);
      const contacts = activities.filter(a => a.event_type === 'contact_created').length;
      const pipeline = activities.filter(a => a.event_type === 'opportunity_stage_changed').length;
      return Math.round(calls + dealsWon * 10 + revenue / 1000 + contacts + pipeline * 5);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { metric_type = 'overall', time_period = 'week', view_mode = 'individual' } = await req.json();
    // NOTE: any client-supplied team_id is intentionally ignored below. The
    // caller may only ever see their own team's leaderboard.
    const { start, prevStart, prevEnd } = calculateDateRanges(time_period);

    // Determine the caller's team server-side (never trust the request body).
    const { data: callerProfile, error: callerProfileErr } = await supabase
      .from('profiles')
      .select('user_id, team_id')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (callerProfileErr) throw callerProfileErr;

    const callerTeamId: string | null = callerProfile?.team_id ?? null;

    // Fetch profiles with team info, always scoped to the caller's team.
    // If the caller has no team, return only themselves — never the global roster.
    let profilesQuery = supabase
      .from('profiles')
      .select(`
        user_id,
        full_name,
        avatar_url,
        title,
        current_level,
        xp_points,
        team_id
      `);

    if (callerTeamId) {
      profilesQuery = profilesQuery.eq('team_id', callerTeamId);
    } else {
      profilesQuery = profilesQuery.eq('user_id', userData.user.id);
    }

    const { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ leaderboard: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const profileMap = new Map<string, Profile>();
    const userIds: string[] = [];
    for (const p of profiles) {
      profileMap.set(p.user_id, p as Profile);
      userIds.push(p.user_id);
    }

    // Fetch team names
    const teamIds = [...new Set(profiles.filter(p => p.team_id).map(p => p.team_id))];
    let teamMap = new Map<string, string>();
    if (teamIds.length > 0) {
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', teamIds);
      if (teams) {
        for (const t of teams) {
          teamMap.set(t.id, t.name);
        }
      }
    }

    // Fetch current period ghl_activities in bulk
    let currentQuery = supabase
      .from('ghl_activities')
      .select('matched_user_id, event_type, value')
      .in('matched_user_id', userIds)
      .gte('occurred_at', start.toISOString());

    if (time_period === 'today') {
      const tomorrow = new Date(start);
      tomorrow.setDate(tomorrow.getDate() + 1);
      currentQuery = currentQuery.lt('occurred_at', tomorrow.toISOString());
    }

    const { data: currentActivities } = await currentQuery;

    // Fetch previous period ghl_activities in bulk (for trends)
    let previousActivities: any[] | null = null;
    if (time_period !== 'all_time') {
      const { data: prevData } = await supabase
        .from('ghl_activities')
        .select('matched_user_id, event_type, value')
        .in('matched_user_id', userIds)
        .gte('occurred_at', prevStart.toISOString())
        .lt('occurred_at', prevEnd.toISOString());
      previousActivities = prevData;
    }

    // Group activities by user
    const currentByUser = new Map<string, any[]>();
    const prevByUser = new Map<string, any[]>();

    for (const a of (currentActivities || [])) {
      const uid = a.matched_user_id;
      if (!uid) continue;
      if (!currentByUser.has(uid)) currentByUser.set(uid, []);
      currentByUser.get(uid)!.push(a);
    }

    for (const a of (previousActivities || [])) {
      const uid = a.matched_user_id;
      if (!uid) continue;
      if (!prevByUser.has(uid)) prevByUser.set(uid, []);
      prevByUser.get(uid)!.push(a);
    }

    // Build individual entries
    const individualEntries: LeaderboardEntry[] = [];
    for (const profile of profiles) {
      const currentActs = currentByUser.get(profile.user_id) || [];
      const prevActs = prevByUser.get(profile.user_id) || [];
      const value = aggregateMetrics(currentActs, metric_type);
      const prevValue = aggregateMetrics(prevActs, metric_type);

      individualEntries.push({
        rank: 0,
        user_id: profile.user_id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        title: profile.title,
        team_name: profile.team_id ? (teamMap.get(profile.team_id) || null) : null,
        current_level: profile.current_level || 1,
        xp_points: profile.xp_points || 0,
        value,
        trend: prevValue > value ? 'down' : prevValue < value ? 'up' : 'same',
      });
    }

    let leaderboardData: LeaderboardEntry[];

    // Build user -> team_id map for aggregation
    const userTeamMap = new Map<string, string | null>();
    for (const p of profiles) {
      userTeamMap.set(p.user_id, p.team_id);
    }

    if (view_mode === 'team') {
      // Aggregate by team
      const teamGroups = new Map<string, {
        team_id: string;
        team_name: string;
        totalValue: number;
        totalPrevValue: number;
        memberCount: number;
        bestLevel: number;
        totalXp: number;
      }>();

      for (const entry of individualEntries) {
        const rawTeamId = userTeamMap.get(entry.user_id) || 'unassigned';
        const tName = entry.team_name || 'Unassigned';
        const prevActs = prevByUser.get(entry.user_id) || [];
        const prevValue = aggregateMetrics(prevActs, metric_type);

        if (!teamGroups.has(rawTeamId)) {
          teamGroups.set(rawTeamId, {
            team_id: rawTeamId,
            team_name: tName,
            totalValue: 0,
            totalPrevValue: 0,
            memberCount: 0,
            bestLevel: 0,
            totalXp: 0,
          });
        }
        const group = teamGroups.get(rawTeamId)!;
        group.totalValue += entry.value;
        group.totalPrevValue += prevValue;
        group.memberCount += 1;
        group.bestLevel = Math.max(group.bestLevel, entry.current_level);
        group.totalXp += entry.xp_points;
      }

      leaderboardData = Array.from(teamGroups.values()).map(g => ({
        rank: 0,
        user_id: g.team_id,
        full_name: g.team_name,
        avatar_url: null,
        title: `${g.memberCount} rep${g.memberCount === 1 ? '' : 's'}`,
        team_name: null,
        current_level: g.bestLevel,
        xp_points: g.totalXp,
        value: Math.round(g.totalValue),
        trend: g.totalPrevValue > g.totalValue ? 'down' : g.totalPrevValue < g.totalValue ? 'up' : 'same',
      }));
    } else {
      leaderboardData = individualEntries;
    }

    // Sort and assign ranks
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
