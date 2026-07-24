import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TeamMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  title: string | null;
  current_level: number;
  current_streak: number;
  xp_points: number;
  status: 'available' | 'on_call' | 'in_meeting' | 'away' | 'offline';
  today_calls: number;
  today_appointments: number;
  today_revenue: number;
  last_coached: string | null;
  // 30-day aggregates from ghl_activities + roleplay_sessions
  period_calls: number;
  period_deals_won: number;
  period_revenue: number;
  period_pipeline_moves: number;
  win_rate: number; // 0-100
  roleplay_count: number;
  avg_roleplay_score: number | null;
  coaching_flags: string[];
}

export interface TeamOverview {
  team_size: number;
  currently_active: number;
  on_calls_now: number;
  today_calls: number;
  today_calls_target: number;
  today_appointments: number;
  today_appointments_target: number;
  today_revenue: number;
  // 30-day team-wide aggregates
  period_calls: number;
  period_deals_won: number;
  period_revenue: number;
  period_pipeline_moves: number;
  period_win_rate: number; // 0-100
}

export interface ManagerInsights {
  team_trend: string;
  coaching_opportunity: {
    rep_name: string;
    reason: string;
    suggested_focus: string;
  } | null;
  skill_gap: {
    gap: string;
    affected_count: number;
    recommendation: string;
  } | null;
  quota_prediction: {
    percentage: number;
    confidence: 'high' | 'medium' | 'low';
    factors: string;
  } | null;
}

// Coaching thresholds (last 30 days)
const MIN_CALLS_30D = 30;
const MIN_WINS_30D = 1;
const LOW_WIN_RATE_PCT = 25;
const MIN_DEALS_FOR_WIN_RATE = 4;
const MIN_ROLEPLAYS_30D = 1;

function computeCoachingFlags(m: {
  period_calls: number;
  period_deals_won: number;
  period_pipeline_moves: number;
  win_rate: number;
  roleplay_count: number;
}): string[] {
  const flags: string[] = [];
  if (m.period_calls < MIN_CALLS_30D) flags.push('Low call activity');
  if (m.period_deals_won < MIN_WINS_30D) flags.push('No wins in 30d');
  if (m.period_deals_won + m.period_pipeline_moves >= MIN_DEALS_FOR_WIN_RATE && m.win_rate < LOW_WIN_RATE_PCT) {
    flags.push('Low win rate');
  }
  if (m.roleplay_count < MIN_ROLEPLAYS_30D) flags.push('No roleplay practice');
  return flags;
}

export function useManagerDashboard() {
  const { profile } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [overview, setOverview] = useState<TeamOverview | null>(null);
  const [insights, setInsights] = useState<ManagerInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamData = useCallback(async () => {
    if (!profile?.team_id) return;

    setIsLoading(true);
    setError(null);
    try {
      // 0) Company targets (fall back to sensible defaults when unset)
      const { data: companyRow } = await supabase
        .from('company_settings')
        .select('daily_calls_target, daily_appointments_target')
        .eq('team_id', profile.team_id)
        .maybeSingle();
      const perRepCalls = companyRow?.daily_calls_target ?? 50;
      const perRepAppts = companyRow?.daily_appointments_target ?? 3;

      // 1) Team members
      const { data: profiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, title, current_level, current_streak, xp_points, team_id, last_coached_at')
        .eq('team_id', profile.team_id);

      if (profilesErr) throw profilesErr;
      const userIds = (profiles ?? []).map((p) => p.user_id);

      if (userIds.length === 0) {
        setTeamMembers([]);
        setOverview({
          team_size: 0,
          currently_active: 0,
          on_calls_now: 0,
          today_calls: 0,
          today_calls_target: 0,
          today_appointments: 0,
          today_appointments_target: 0,
          today_revenue: 0,
          period_calls: 0,
          period_deals_won: 0,
          period_revenue: 0,
          period_pipeline_moves: 0,
          period_win_rate: 0,
        });
        return;
      }

      // 2) Parallel fetches
      const today = new Date().toISOString().split('T')[0];
      const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        { data: dailyStats, error: dailyErr },
        { data: statuses, error: statusErr },
        { data: activities, error: actErr },
        { data: roleplays, error: rpErr },
      ] = await Promise.all([
        supabase.from('daily_stats').select('*').eq('date', today).in('user_id', userIds),
        supabase.from('user_status').select('*').in('user_id', userIds),
        supabase
          .from('ghl_activities')
          .select('matched_user_id, event_type, value, occurred_at')
          .in('matched_user_id', userIds)
          .gte('occurred_at', since30),
        supabase
          .from('roleplay_sessions')
          .select('user_id, score, status, completed_at')
          .in('user_id', userIds)
          .eq('status', 'completed')
          .gte('completed_at', since30),
      ]);

      if (dailyErr) throw dailyErr;
      if (statusErr) throw statusErr;
      if (actErr) throw actErr;
      if (rpErr) throw rpErr;

      const statsMap = new Map((dailyStats ?? []).map((s) => [s.user_id, s]));
      const statusMap = new Map((statuses ?? []).map((s) => [s.user_id, s]));

      // 3) Per-rep aggregation
      const members: TeamMember[] = (profiles ?? []).map((p) => {
        const stats = statsMap.get(p.user_id);
        const status = statusMap.get(p.user_id);
        const acts = (activities ?? []).filter((a) => a.matched_user_id === p.user_id);
        const reps = (roleplays ?? []).filter((r) => r.user_id === p.user_id);

        const period_calls = acts.filter((a) => a.event_type === 'call').length;
        const period_deals_won = acts.filter((a) => a.event_type === 'opportunity_won').length;
        const period_pipeline_moves = acts.filter((a) => a.event_type === 'opportunity_stage_changed').length;
        const period_revenue = acts
          .filter((a) => a.event_type === 'opportunity_won')
          .reduce((sum, a) => sum + (Number(a.value) || 0), 0);
        const totalDealActivity = period_deals_won + period_pipeline_moves;
        const win_rate = totalDealActivity > 0 ? Math.round((period_deals_won / totalDealActivity) * 100) : 0;

        const scores = reps.map((r) => r.score).filter((s): s is number => typeof s === 'number');
        const avg_roleplay_score = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

        const base = {
          user_id: p.user_id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          title: p.title,
          current_level: p.current_level,
          current_streak: p.current_streak,
          xp_points: p.xp_points,
          status: (status?.status || 'offline') as TeamMember['status'],
          today_calls: (stats?.calls_made || 0) + (stats?.calls_received || 0),
          today_appointments: stats?.appointments_set || 0,
          today_revenue: Number(stats?.revenue_closed) || 0,
          last_coached: (p as any).last_coached_at ?? null,
          period_calls,
          period_deals_won,
          period_revenue,
          period_pipeline_moves,
          win_rate,
          roleplay_count: reps.length,
          avg_roleplay_score,
        };

        return {
          ...base,
          coaching_flags: computeCoachingFlags({
            period_calls,
            period_deals_won,
            period_pipeline_moves,
            win_rate,
            roleplay_count: reps.length,
          }),
        };
      });

      setTeamMembers(members);

      // 4) Team-wide overview
      const activeStatuses = ['available', 'on_call', 'in_meeting'];
      const team_period_calls = members.reduce((s, m) => s + m.period_calls, 0);
      const team_period_wins = members.reduce((s, m) => s + m.period_deals_won, 0);
      const team_period_pipeline = members.reduce((s, m) => s + m.period_pipeline_moves, 0);
      const team_period_revenue = members.reduce((s, m) => s + m.period_revenue, 0);
      const team_deal_activity = team_period_wins + team_period_pipeline;

      setOverview({
        team_size: members.length,
        currently_active: members.filter((m) => activeStatuses.includes(m.status)).length,
        on_calls_now: members.filter((m) => m.status === 'on_call').length,
        today_calls: members.reduce((sum, m) => sum + m.today_calls, 0),
        today_calls_target: members.length * 50,
        today_appointments: members.reduce((sum, m) => sum + m.today_appointments, 0),
        today_appointments_target: members.length * 3,
        today_revenue: members.reduce((sum, m) => sum + m.today_revenue, 0),
        period_calls: team_period_calls,
        period_deals_won: team_period_wins,
        period_revenue: team_period_revenue,
        period_pipeline_moves: team_period_pipeline,
        period_win_rate: team_deal_activity > 0 ? Math.round((team_period_wins / team_deal_activity) * 100) : 0,
      });
    } catch (err) {
      console.error('Error fetching team data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  }, [profile?.team_id]);

  const fetchInsights = useCallback(
    async (forceRefresh = false) => {
      if (!profile?.team_id) return;

      setIsLoadingInsights(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-manager-insights', {
          body: { team_id: profile.team_id, force_refresh: forceRefresh },
        });

        if (error) throw error;

        if (data?.success) {
          setInsights(data.insights);
        }
      } catch (error) {
        console.error('Error fetching insights:', error);
      } finally {
        setIsLoadingInsights(false);
      }
    },
    [profile?.team_id],
  );

  useEffect(() => {
    fetchTeamData();
    fetchInsights();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('manager-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_status' }, () => fetchTeamData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_stats' }, () => fetchTeamData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ghl_activities' }, () => fetchTeamData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTeamData, fetchInsights]);

  // Triage categories now driven by 30-day numbers + coaching flags
  const needsAttention = teamMembers.filter((m) => m.coaching_flags.length >= 2);

  const onFire = teamMembers
    .filter((m) => m.period_deals_won >= 3 || (m.win_rate >= 50 && m.period_deals_won + m.period_pipeline_moves >= MIN_DEALS_FOR_WIN_RATE))
    .sort((a, b) => b.period_deals_won - a.period_deals_won);

  const coachingDue = teamMembers.filter((m) => {
    if (!m.last_coached) return true;
    const days = Math.floor((Date.now() - new Date(m.last_coached).getTime()) / (1000 * 60 * 60 * 24));
    return days >= 7;
  });

  return {
    teamMembers,
    overview,
    insights,
    needsAttention,
    onFire,
    coachingDue,
    isLoading,
    isLoadingInsights,
    error,
    refetch: fetchTeamData,
    refreshInsights: () => fetchInsights(true),
  };
}
