import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type MetricType = 'overall' | 'calls' | 'deals_won' | 'revenue' | 'contacts' | 'pipeline';
export type TimePeriod = 'today' | 'week' | 'month' | 'all_time';
export type ViewMode = 'individual' | 'team';

export interface LeaderboardEntry {
  rank: number;
  previous_rank?: number;
  rank_delta?: number;
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

export interface Competition {
  id: string;
  name: string;
  description: string;
  metric_type: string;
  start_date: string;
  end_date: string;
  prize_description: string | null;
  status: 'upcoming' | 'active' | 'completed';
}

const metricLabels: Record<MetricType, string> = {
  overall: 'Overall',
  calls: 'Calls',
  deals_won: 'Deals Won',
  revenue: 'Revenue',
  contacts: 'Contacts',
  pipeline: 'Pipeline',
};

export function useLeaderboard() {
  const { user, profile } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metricType, setMetricType] = useState<MetricType>('overall');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [viewMode, setViewMode] = useState<ViewMode>('individual');

  const previousRanksRef = useRef<Map<string, number>>(new Map());

  const fetchLeaderboard = async () => {
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('calculate-leaderboard', {
        body: {
          metric_type: metricType,
          time_period: timePeriod,
          view_mode: viewMode,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const incoming: LeaderboardEntry[] = data.leaderboard || [];
      const prevRanks = previousRanksRef.current;
      const enriched = incoming.map((e) => {
        const previous_rank = prevRanks.get(e.user_id);
        const rank_delta =
          previous_rank !== undefined ? previous_rank - e.rank : 0;
        return { ...e, previous_rank, rank_delta };
      });

      const nextRanks = new Map<string, number>();
      incoming.forEach((e) => nextRanks.set(e.user_id, e.rank));
      previousRanksRef.current = nextRanks;

      setLeaderboard(enriched);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load leaderboard';
      console.error('Error fetching leaderboard:', err);
      setError(message);
      setLeaderboard([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompetitions = async () => {
    try {
      const { data, error: queryError } = await supabase
        .from('competitions')
        .select('id, name, description, metric_type, start_date, end_date, prize_description, status')
        .in('status', ['active', 'upcoming'])
        .order('start_date', { ascending: true });

      if (queryError) throw queryError;

      setCompetitions((data || []).map((comp: any) => ({
        id: comp.id,
        name: comp.name,
        description: comp.description,
        metric_type: comp.metric_type,
        start_date: comp.start_date,
        end_date: comp.end_date,
        prize_description: comp.prize_description,
        status: comp.status as 'upcoming' | 'active' | 'completed',
      })));
    } catch (err) {
      console.error('Error fetching competitions:', err);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    previousRanksRef.current = new Map();
    fetchLeaderboard();
  }, [metricType, timePeriod, viewMode]);

  useEffect(() => {
    fetchCompetitions();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchLeaderboard(), 800);
    };

    const channel = supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ghl_activities' },
        scheduleRefetch
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        scheduleRefetch
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  const currentUserRank = leaderboard.find(e => e.user_id === user?.id);
  const currentUserTeamEntry = viewMode === 'team' && profile?.team_id
    ? leaderboard.find(e => e.user_id === profile.team_id)
    : undefined;

  const topThree = leaderboard.slice(0, 3);
  const restOfRankings = leaderboard.slice(3, 50);

  return {
    leaderboard,
    topThree,
    restOfRankings,
    currentUserRank,
    currentUserTeamEntry,
    competitions,
    isLoading,
    error,
    metricType,
    setMetricType,
    timePeriod,
    setTimePeriod,
    viewMode,
    setViewMode,
    refetch: fetchLeaderboard,
    metricLabels,
  };
}
