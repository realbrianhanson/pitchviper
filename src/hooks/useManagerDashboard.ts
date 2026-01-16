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

export function useManagerDashboard() {
  const { user, profile } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [overview, setOverview] = useState<TeamOverview | null>(null);
  const [insights, setInsights] = useState<ManagerInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  const fetchTeamData = useCallback(async () => {
    if (!profile?.team_id) return;

    setIsLoading(true);
    try {
      // Get team members
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('team_id', profile.team_id);

      if (error) throw error;

      // Get today's date
      const today = new Date().toISOString().split('T')[0];

      // Get daily stats for today
      const { data: dailyStats } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('date', today)
        .in('user_id', profiles?.map(p => p.user_id) || []);

      // Get user statuses
      const { data: statuses } = await supabase
        .from('user_status')
        .select('*')
        .in('user_id', profiles?.map(p => p.user_id) || []);

      const statsMap = new Map(dailyStats?.map(s => [s.user_id, s]) || []);
      const statusMap = new Map(statuses?.map(s => [s.user_id, s]) || []);

      const members: TeamMember[] = (profiles || []).map(p => {
        const stats = statsMap.get(p.user_id);
        const status = statusMap.get(p.user_id);
        
        return {
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
          last_coached: null, // Would come from coaching sessions table
        };
      });

      setTeamMembers(members);

      // Calculate overview
      const activeStatuses = ['available', 'on_call', 'in_meeting'];
      const overview: TeamOverview = {
        team_size: members.length,
        currently_active: members.filter(m => activeStatuses.includes(m.status)).length,
        on_calls_now: members.filter(m => m.status === 'on_call').length,
        today_calls: members.reduce((sum, m) => sum + m.today_calls, 0),
        today_calls_target: members.length * 50, // 50 calls per rep target
        today_appointments: members.reduce((sum, m) => sum + m.today_appointments, 0),
        today_appointments_target: members.length * 3, // 3 appts per rep target
        today_revenue: members.reduce((sum, m) => sum + m.today_revenue, 0),
      };

      setOverview(overview);
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.team_id]);

  const fetchInsights = useCallback(async (forceRefresh = false) => {
    if (!profile?.team_id) return;

    setIsLoadingInsights(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-manager-insights', {
        body: { team_id: profile.team_id, force_refresh: forceRefresh }
      });

      if (error) throw error;
      
      if (data.success) {
        setInsights(data.insights);
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setIsLoadingInsights(false);
    }
  }, [profile?.team_id]);

  useEffect(() => {
    fetchTeamData();
    fetchInsights();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('manager-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_status' },
        () => fetchTeamData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_stats' },
        () => fetchTeamData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calls' },
        () => fetchTeamData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTeamData, fetchInsights]);

  // Performance categories
  const needsAttention = teamMembers.filter(m => {
    const callTarget = 50;
    return m.today_calls < callTarget * 0.5; // Below 50% of target
  });

  const onFire = teamMembers.filter(m => {
    const callTarget = 50;
    return m.today_calls >= callTarget * 1.2; // Above 120% of target
  });

  const coachingDue = teamMembers.filter(m => {
    if (!m.last_coached) return true; // Never coached
    const lastCoached = new Date(m.last_coached);
    const daysSinceCoached = Math.floor((Date.now() - lastCoached.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceCoached >= 7;
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
    refetch: fetchTeamData,
    refreshInsights: () => fetchInsights(true),
  };
}