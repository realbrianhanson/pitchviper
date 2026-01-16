import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface CoachingSession {
  id: string;
  manager_id: string;
  rep_id: string;
  notes: string;
  focus_areas: string[];
  action_items: string[];
  next_session_date: string | null;
  created_at: string;
}

export interface RepCoachingProfile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  title: string | null;
  hire_date: string | null;
  current_level: number;
  xp_points: number;
  current_streak: number;
  longest_streak: number;
  last_coached_at: string | null;
  team_id: string | null;
}

export interface CoachingInsights {
  focus_areas: Array<{
    area: string;
    reason: string;
    action: string;
  }>;
  conversation_starters: string[];
  recognition_points: string[];
  suggested_roleplay: {
    scenario_type: string;
    reason: string;
  } | null;
  performance_insights: {
    trend: 'improving' | 'declining' | 'steady';
    key_strength: string;
    biggest_opportunity: string;
  } | null;
  patterns_detected: string[];
}

export interface RepStats {
  calls_30d: number;
  connect_rate: number;
  deals_closed: number;
  revenue: number;
  avg_roleplay_score: number | null;
  team_avg_calls: number;
  team_avg_connect_rate: number;
  daily_stats: Array<{
    date: string;
    calls_made: number;
    calls_received: number;
    appointments_set: number;
    deals_closed: number;
    revenue_closed: number;
  }>;
}

export function useCoaching() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Get all team members who can be coached
  const { data: teamMembers = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ['coaching-team-members', profile?.team_id],
    queryFn: async () => {
      if (!profile?.team_id) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, title, hire_date, current_level, xp_points, current_streak, longest_streak, last_coached_at, team_id')
        .eq('team_id', profile.team_id)
        .neq('user_id', user?.id);

      if (error) throw error;
      return (data || []) as RepCoachingProfile[];
    },
    enabled: !!profile?.team_id && !!user,
  });

  // Get coaching sessions for a specific rep
  const useRepCoachingSessions = (repId: string | null) => {
    return useQuery({
      queryKey: ['coaching-sessions', repId],
      queryFn: async () => {
        if (!repId) return [];

        const { data, error } = await supabase
          .from('coaching_sessions')
          .select('*')
          .eq('rep_id', repId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []) as CoachingSession[];
      },
      enabled: !!repId,
    });
  };

  // Get recent calls for a rep
  const useRepRecentCalls = (repId: string | null) => {
    return useQuery({
      queryKey: ['rep-recent-calls', repId],
      queryFn: async () => {
        if (!repId) return [];

        const { data, error } = await supabase
          .from('calls')
          .select('*')
          .eq('user_id', repId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        return data || [];
      },
      enabled: !!repId,
    });
  };

  // Get recent roleplay sessions for a rep
  const useRepRoleplaySessions = (repId: string | null) => {
    return useQuery({
      queryKey: ['rep-roleplay-sessions', repId],
      queryFn: async () => {
        if (!repId) return [];

        const { data, error } = await supabase
          .from('roleplay_sessions')
          .select('*, roleplay_scenarios(name, difficulty)')
          .eq('user_id', repId)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        return data || [];
      },
      enabled: !!repId,
    });
  };

  // Get recent badges for a rep
  const useRepRecentBadges = (repId: string | null) => {
    return useQuery({
      queryKey: ['rep-recent-badges', repId],
      queryFn: async () => {
        if (!repId) return [];

        const { data, error } = await supabase
          .from('user_badges')
          .select('*, badges(*)')
          .eq('user_id', repId)
          .order('earned_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        return data || [];
      },
      enabled: !!repId,
    });
  };

  // Generate AI coaching insights
  const useCoachingInsights = (repId: string | null) => {
    return useQuery({
      queryKey: ['coaching-insights', repId],
      queryFn: async () => {
        if (!repId) return null;

        const { data, error } = await supabase.functions.invoke('generate-coaching-insights', {
          body: { rep_id: repId }
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error);

        return {
          insights: data.insights as CoachingInsights,
          stats: data.stats as RepStats,
        };
      },
      enabled: !!repId,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });
  };

  // Save coaching session
  const saveCoachingSession = useMutation({
    mutationFn: async (session: {
      rep_id: string;
      notes: string;
      focus_areas: string[];
      action_items: string[];
      next_session_date?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Insert coaching session
      const { data, error } = await supabase
        .from('coaching_sessions')
        .insert({
          manager_id: user.id,
          rep_id: session.rep_id,
          notes: session.notes,
          focus_areas: session.focus_areas,
          action_items: session.action_items,
          next_session_date: session.next_session_date || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Update rep's last_coached_at
      await supabase
        .from('profiles')
        .update({ last_coached_at: new Date().toISOString() })
        .eq('user_id', session.rep_id);

      // Log activity
      await supabase.rpc('log_activity', {
        p_user_id: user.id,
        p_activity_type: 'training_completed',
        p_metadata: {
          type: 'coaching_session',
          rep_id: session.rep_id,
          session_id: data.id
        }
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['coaching-sessions', variables.rep_id] });
      queryClient.invalidateQueries({ queryKey: ['coaching-team-members'] });
      toast.success('Coaching session saved!');
    },
    onError: (error) => {
      console.error('Error saving coaching session:', error);
      toast.error('Failed to save coaching session');
    },
  });

  return {
    teamMembers,
    isLoadingMembers,
    useRepCoachingSessions,
    useRepRecentCalls,
    useRepRoleplaySessions,
    useRepRecentBadges,
    useCoachingInsights,
    saveCoachingSession,
  };
}
