import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type MetricType = 'overall' | 'calls' | 'appointments' | 'revenue' | 'roleplay' | 'xp';
export type TimePeriod = 'today' | 'week' | 'month' | 'all_time';

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  title: string | null;
  team_name: string | null;
  current_level: number;
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

export function useLeaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [metricType, setMetricType] = useState<MetricType>('overall');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-leaderboard', {
        body: {
          metric_type: metricType,
          time_period: timePeriod,
        },
      });

      if (error) throw error;
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLeaderboard([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompetitions = async () => {
    try {
      // Note: competitions table types will be available after types regeneration
      const { data, error } = await supabase
        .from('competitions' as any)
        .select('id, name, description, metric_type, start_date, end_date, prize_description, status')
        .in('status', ['active', 'upcoming'])
        .order('start_date', { ascending: true });

      if (error) throw error;
      
      setCompetitions((data as any[] || []).map((comp: any) => ({
        id: comp.id,
        name: comp.name,
        description: comp.description,
        metric_type: comp.metric_type,
        start_date: comp.start_date,
        end_date: comp.end_date,
        prize_description: comp.prize_description,
        status: comp.status as 'upcoming' | 'active' | 'completed',
      })));
    } catch (error) {
      console.error('Error fetching competitions:', error);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [metricType, timePeriod]);

  useEffect(() => {
    fetchCompetitions();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calls' },
        () => fetchLeaderboard()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'roleplay_sessions' },
        () => fetchLeaderboard()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchLeaderboard()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const currentUserRank = leaderboard.find(e => e.user_id === user?.id);
  const topThree = leaderboard.slice(0, 3);
  const restOfRankings = leaderboard.slice(3, 50);

  return {
    leaderboard,
    topThree,
    restOfRankings,
    currentUserRank,
    competitions,
    isLoading,
    metricType,
    setMetricType,
    timePeriod,
    setTimePeriod,
    refetch: fetchLeaderboard,
  };
}