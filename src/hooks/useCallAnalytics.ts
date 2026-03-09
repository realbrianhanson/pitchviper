import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, format } from 'date-fns';

export type TimeRange = 'today' | 'this_week' | 'this_month' | 'last_30_days' | 'custom';

interface DateRange {
  start: Date;
  end: Date;
}

export interface CallAnalytics {
  metrics: {
    totalCalls: { value: number; prevValue: number };
    connectRate: { value: number; prevValue: number };
    avgDuration: { value: number; prevValue: number };
    appointmentsPerCall: { value: number; prevValue: number };
  };
  callsOverTime: Array<{ date: string; total: number; connected: number }>;
  outcomes: {
    connected: number;
    voicemail: number;
    no_answer: number;
    wrong_number: number;
  };
  dispositions: Record<string, number>;
  heatmap: Array<{
    day: string;
    hours: Array<{ hour: number; total: number; connected: number; connectRate: number }>;
  }>;
  objectionFrequency: Array<{ objection: string; count: number }>;
  topPerformers: {
    byConnectRate: Array<{
      user_id: string;
      total: number;
      connected: number;
      connectRate: number;
      profile: { full_name: string; avatar_url: string | null } | null;
    }>;
    byAppointments: Array<{
      user_id: string;
      appointments: number;
      profile: { full_name: string; avatar_url: string | null } | null;
    }>;
  } | null;
}

export const useCallAnalytics = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>('this_week');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);

  // Load user's team
  useEffect(() => {
    if (!user) return;
    
    const loadTeam = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data?.team_id) {
        setTeamId(data.team_id);
      }
    };

    loadTeam();
  }, [user]);

  const getDateRange = (): DateRange => {
    const now = new Date();
    
    switch (timeRange) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'this_week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) };
      case 'this_month':
        return { start: startOfMonth(now), end: endOfDay(now) };
      case 'last_30_days':
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case 'custom':
        return customRange || { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      default:
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
    }
  };

  const { data, isLoading, error, refetch } = useQuery<CallAnalytics>({
    queryKey: ['call-analytics', user?.id, teamId, timeRange, customRange],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const dateRange = getDateRange();
      
      const response = await supabase.functions.invoke('get-call-analytics', {
        body: {
          user_id: user.id,
          team_id: teamId,
          start_date: dateRange.start.toISOString(),
          end_date: dateRange.end.toISOString(),
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Real-time subscription for new calls
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('calls-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  return {
    data,
    isLoading,
    error,
    timeRange,
    setTimeRange,
    customRange,
    setCustomRange,
    refetch,
    getDateRangeLabel: () => {
      const range = getDateRange();
      return `${format(range.start, 'MMM d')} - ${format(range.end, 'MMM d, yyyy')}`;
    },
  };
};
