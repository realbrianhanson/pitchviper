import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { subDays, format, startOfDay, eachDayOfInterval } from "date-fns";

export interface PerformanceProfile {
  fullName: string;
  avatarUrl: string | null;
  xpPoints: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
}

export interface CareerStats {
  totalCalls: number;
  totalRevenue: number;
  totalDeals: number;
  careerCloseRate: number;
}

export interface DailyTrend {
  date: string;
  calls: number;
  connected: number;
  appointments: number;
  deals: number;
  revenue: number;
}

export interface TeamAverage {
  avgCalls: number;
  avgCloseRate: number;
}

export interface PerformanceInsights {
  bigWin: { title: string; description: string };
  growthArea: { title: string; description: string };
  patternDetected: { title: string; description: string };
  recommendedActions: string[];
}

export interface UserGoals {
  dailyCallsTarget: number;
  dailyAppointmentsTarget: number;
  weeklyRevenueTarget: number;
}

export interface GoalProgress {
  todayCalls: number;
  todayAppointments: number;
  weekRevenue: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: string;
}

export function usePerformanceData() {
  const { user, session } = useAuth();
  const [profile, setProfile] = useState<PerformanceProfile | null>(null);
  const [careerStats, setCareerStats] = useState<CareerStats | null>(null);
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([]);
  const [teamAverages, setTeamAverages] = useState<TeamAverage | null>(null);
  const [insights, setInsights] = useState<PerformanceInsights | null>(null);
  const [goalProgress, setGoalProgress] = useState<GoalProgress | null>(null);
  const [goals, setGoals] = useState<UserGoals>({ 
    dailyCallsTarget: 50, 
    dailyAppointmentsTarget: 5,
    weeklyRevenueTarget: 10000
  });
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const xpToNextLevel = (level: number) => level * 500;

  const fetchProfileAndStats = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, xp_points, current_level, current_streak, longest_streak, team_id")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;

      setProfile({
        fullName: profileData.full_name,
        avatarUrl: profileData.avatar_url,
        xpPoints: profileData.xp_points,
        currentLevel: profileData.current_level,
        currentStreak: profileData.current_streak,
        longestStreak: profileData.longest_streak,
      });

      // Fetch all-time calls for career stats
      const { data: allCalls, error: callsError } = await supabase
        .from("calls")
        .select("outcome, disposition, deal_value")
        .eq("user_id", user.id);

      if (callsError) throw callsError;

      const totalCalls = allCalls?.length || 0;
      const connectedCalls = allCalls?.filter(c => c.outcome === "connected").length || 0;
      const totalDeals = allCalls?.filter(c => c.disposition === "deal_closed").length || 0;
      const totalRevenue = allCalls?.reduce((sum, c) => sum + (c.deal_value || 0), 0) || 0;

      setCareerStats({
        totalCalls,
        totalRevenue,
        totalDeals,
        careerCloseRate: connectedCalls > 0 ? (totalDeals / connectedCalls) * 100 : 0,
      });

      // Fetch last 30 days of calls for trends
      const thirtyDaysAgo = subDays(new Date(), 30);
      const { data: recentCalls, error: recentError } = await supabase
        .from("calls")
        .select("created_at, outcome, disposition, deal_value")
        .eq("user_id", user.id)
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (recentError) throw recentError;

      // Build daily trends
      const days = eachDayOfInterval({ start: thirtyDaysAgo, end: new Date() });
      const trendsMap: Record<string, DailyTrend> = {};
      
      days.forEach(day => {
        const dateStr = format(day, "yyyy-MM-dd");
        trendsMap[dateStr] = {
          date: dateStr,
          calls: 0,
          connected: 0,
          appointments: 0,
          deals: 0,
          revenue: 0,
        };
      });

      recentCalls?.forEach(call => {
        const dateStr = format(new Date(call.created_at), "yyyy-MM-dd");
        if (trendsMap[dateStr]) {
          trendsMap[dateStr].calls++;
          if (call.outcome === "connected") {
            trendsMap[dateStr].connected++;
          }
          if (call.disposition === "appointment_set") {
            trendsMap[dateStr].appointments++;
          }
          if (call.disposition === "deal_closed") {
            trendsMap[dateStr].deals++;
            trendsMap[dateStr].revenue += call.deal_value || 0;
          }
        }
      });

      setDailyTrends(Object.values(trendsMap).sort((a, b) => a.date.localeCompare(b.date)));

      // Fetch team averages if user is in a team
      if (profileData.team_id) {
        const { data: teamCalls } = await supabase
          .from("calls")
          .select("user_id, outcome, disposition")
          .eq("team_id", profileData.team_id)
          .gte("created_at", thirtyDaysAgo.toISOString());

        if (teamCalls && teamCalls.length > 0) {
          const userCallCounts: Record<string, { total: number; connected: number; deals: number }> = {};
          teamCalls.forEach(call => {
            if (!userCallCounts[call.user_id]) {
              userCallCounts[call.user_id] = { total: 0, connected: 0, deals: 0 };
            }
            userCallCounts[call.user_id].total++;
            if (call.outcome === "connected") {
              userCallCounts[call.user_id].connected++;
            }
            if (call.disposition === "deal_closed") {
              userCallCounts[call.user_id].deals++;
            }
          });

          const users = Object.values(userCallCounts);
          const avgCalls = users.reduce((sum, u) => sum + u.total, 0) / users.length;
          const totalConnected = users.reduce((sum, u) => sum + u.connected, 0);
          const totalDeals = users.reduce((sum, u) => sum + u.deals, 0);
          const avgCloseRate = totalConnected > 0 ? (totalDeals / totalConnected) * 100 : 0;

          setTeamAverages({ avgCalls, avgCloseRate });
        }
      }

      // Fetch today's stats for goal progress
      const today = format(startOfDay(new Date()), "yyyy-MM-dd");
      const { data: todayStats } = await supabase
        .from("daily_stats")
        .select("calls_made, calls_received, appointments_set, revenue_closed")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();

      // Get week's revenue (last 7 days)
      const weekAgo = subDays(new Date(), 7);
      const { data: weekStats } = await supabase
        .from("daily_stats")
        .select("revenue_closed")
        .eq("user_id", user.id)
        .gte("date", format(weekAgo, "yyyy-MM-dd"));

      const weekRevenue = weekStats?.reduce((sum, s) => sum + s.revenue_closed, 0) || 0;

      setGoalProgress({
        todayCalls: (todayStats?.calls_made || 0) + (todayStats?.calls_received || 0),
        todayAppointments: todayStats?.appointments_set || 0,
        weekRevenue,
      });

      // Set placeholder badges (will be expanded later)
      setBadges([
        { id: "first-call", name: "First Call", description: "Make your first call", icon: "📞", earned: totalCalls >= 1 },
        { id: "call-10", name: "Dialing In", description: "Make 10 calls", icon: "🔥", earned: totalCalls >= 10 },
        { id: "call-100", name: "Century Club", description: "Make 100 calls", icon: "💯", earned: totalCalls >= 100 },
        { id: "first-deal", name: "Closer", description: "Close your first deal", icon: "💰", earned: totalDeals >= 1 },
        { id: "deal-10", name: "Deal Machine", description: "Close 10 deals", icon: "🏆", earned: totalDeals >= 10 },
        { id: "streak-7", name: "Week Warrior", description: "7-day calling streak", icon: "⚡", earned: profileData.longest_streak >= 7 },
        { id: "streak-30", name: "Monthly Monster", description: "30-day calling streak", icon: "🌟", earned: profileData.longest_streak >= 30 },
        { id: "revenue-10k", name: "10K Club", description: "Close $10,000 in revenue", icon: "💎", earned: totalRevenue >= 10000 },
      ]);

      setError(null);
    } catch (err: any) {
      console.error("Performance data fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchInsights = useCallback(async () => {
    if (!session?.access_token) return;

    setInsightsLoading(true);
    try {
      const response = await supabase.functions.invoke("generate-performance-insights", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        console.error("Insights error:", response.error);
        return;
      }

      setInsights(response.data);
    } catch (err) {
      console.error("Failed to fetch insights:", err);
    } finally {
      setInsightsLoading(false);
    }
  }, [session?.access_token]);

  const updateGoals = (newGoals: Partial<UserGoals>) => {
    setGoals(prev => ({ ...prev, ...newGoals }));
    // In a full implementation, save to database
  };

  useEffect(() => {
    if (user) {
      fetchProfileAndStats();
    }
  }, [user, fetchProfileAndStats]);

  return {
    profile,
    careerStats,
    dailyTrends,
    teamAverages,
    insights,
    insightsLoading,
    goals,
    goalProgress,
    badges,
    loading,
    error,
    xpToNextLevel,
    fetchInsights,
    updateGoals,
    refetch: fetchProfileAndStats,
  };
}
