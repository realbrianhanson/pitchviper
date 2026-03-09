import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export interface TeamMemberWithStatus {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  title: string | null;
  status: "available" | "on_call" | "in_meeting" | "away" | "offline";
  current_call_started_at: string | null;
  last_activity_at: string;
  today_stats: {
    calls_made: number;
    appointments_set: number;
    deals_closed: number;
    revenue_closed: number;
  };
  daily_goal_progress: number;
  is_top_performer: boolean;
  has_pending_sos: boolean;
}

export interface TeamStats {
  total_calls: number;
  total_appointments: number;
  total_revenue: number;
  total_deals: number;
}

export interface ActivityItem {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  activity_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DealCelebrationData {
  closerName: string;
  closerAvatar: string | null;
  dealValue: number;
  clientName: string;
  dealType: string;
  dealsToday: number;
}

export function useWarRoomData() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithStatus[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats>({
    total_calls: 0,
    total_appointments: 0,
    total_revenue: 0,
    total_deals: 0,
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pulsingMembers, setPulsingMembers] = useState<Set<string>>(new Set());
  const [celebratingMembers, setCelebratingMembers] = useState<Set<string>>(new Set());
  const [celebrationData, setCelebrationData] = useState<DealCelebrationData | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const fetchWarRoomData = useCallback(async () => {
    if (!user) return;

    try {
      // Get user's team
      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.team_id) {
        setIsLoading(false);
        return;
      }

      // Get team members with their profiles
      const { data: members } = await supabase
        .from("profiles")
        .select("*")
        .eq("team_id", profile.team_id);

      if (!members) {
        setIsLoading(false);
        return;
      }

      // Get user statuses
      const { data: statuses } = await supabase
        .from("user_status")
        .select("*");

      // Get today's stats for all team members
      const today = new Date().toISOString().split("T")[0];
      const { data: dailyStats } = await supabase
        .from("daily_stats")
        .select("*")
        .eq("date", today)
        .in("user_id", members.map(m => m.user_id));

      // Get pending SOS alerts
      const { data: pendingAlerts } = await supabase
        .from("sos_alerts")
        .select("user_id")
        .eq("team_id", profile.team_id)
        .eq("status", "pending");

      const sosUserIds = new Set(pendingAlerts?.map(a => a.user_id) || []);

      // Calculate team totals
      let totalCalls = 0;
      let totalAppointments = 0;
      let totalRevenue = 0;
      let totalDeals = 0;

      const statsMap = new Map(dailyStats?.map(s => [s.user_id, s]) || []);
      const statusMap = new Map(statuses?.map(s => [s.user_id, s]) || []);

      // Find top performer
      const memberStats = members.map(m => {
        const stats = statsMap.get(m.user_id);
        return {
          user_id: m.user_id,
          revenue: stats?.revenue_closed || 0,
        };
      });
      const topPerformerId = memberStats.sort((a, b) => Number(b.revenue) - Number(a.revenue))[0]?.user_id;

      const enrichedMembers: TeamMemberWithStatus[] = members.map(member => {
        const stats = statsMap.get(member.user_id);
        const status = statusMap.get(member.user_id);

        const calls = stats?.calls_made || 0;
        const appointments = stats?.appointments_set || 0;
        const deals = stats?.deals_closed || 0;
        const revenue = Number(stats?.revenue_closed || 0);

        totalCalls += calls;
        totalAppointments += appointments;
        totalDeals += deals;
        totalRevenue += revenue;

        // Daily goal is 50 calls
        const dailyGoalProgress = Math.min((calls / 50) * 100, 100);

        return {
          id: member.id,
          user_id: member.user_id,
          full_name: member.full_name,
          avatar_url: member.avatar_url,
          title: member.title,
          status: (status?.status as TeamMemberWithStatus["status"]) || "offline",
          current_call_started_at: status?.current_call_started_at || null,
          last_activity_at: status?.last_activity_at || member.updated_at,
          today_stats: {
            calls_made: calls,
            appointments_set: appointments,
            deals_closed: deals,
            revenue_closed: revenue,
          },
          daily_goal_progress: dailyGoalProgress,
          is_top_performer: member.user_id === topPerformerId && revenue > 0,
          has_pending_sos: sosUserIds.has(member.user_id),
        };
      });

      setTeamMembers(enrichedMembers);
      setTeamStats({
        total_calls: totalCalls,
        total_appointments: totalAppointments,
        total_revenue: totalRevenue,
        total_deals: totalDeals,
      });

      // Get recent activities
      const { data: recentActivities } = await supabase
        .from("activities")
        .select("*")
        .eq("team_id", profile.team_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (recentActivities) {
        const activitiesWithNames: ActivityItem[] = recentActivities.map(activity => {
          const member = members.find(m => m.user_id === activity.user_id);
          return {
            id: activity.id,
            user_id: activity.user_id,
            user_name: member?.full_name || "Unknown",
            user_avatar: member?.avatar_url || null,
            activity_type: activity.activity_type,
            metadata: (activity.metadata as Record<string, unknown>) || {},
            created_at: activity.created_at,
          };
        });
        setActivities(activitiesWithNames);
      }

      // Get user preferences for sound
      const { data: preferences } = await supabase
        .from("user_preferences")
        .select("celebration_sounds_enabled")
        .eq("user_id", user.id)
        .single();

      if (preferences) {
        setSoundEnabled(preferences.celebration_sounds_enabled);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching war room data:", error);
      setIsLoading(false);
    }
  }, [user]);

  // Trigger pulse animation
  const triggerPulse = useCallback((userId: string) => {
    setPulsingMembers(prev => new Set(prev).add(userId));
    setTimeout(() => {
      setPulsingMembers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }, 1000);
  }, []);

  // Trigger celebration animation
  const triggerCelebration = useCallback((
    userId: string, 
    userName: string, 
    userAvatar: string | null,
    value: number,
    clientName: string,
    dealType: string,
    dealsToday: number
  ) => {
    setCelebratingMembers(prev => new Set(prev).add(userId));
    
    // Set celebration data for full-screen overlay
    setCelebrationData({
      closerName: userName,
      closerAvatar: userAvatar,
      dealValue: value,
      clientName: clientName || "New Client",
      dealType: dealType || "New Business",
      dealsToday,
    });
    setShowCelebration(true);

    setTimeout(() => {
      setCelebratingMembers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }, 5000);
  }, []);

  const closeCelebration = useCallback(() => {
    setShowCelebration(false);
    setTimeout(() => setCelebrationData(null), 300);
  }, []);

  useEffect(() => {
    fetchWarRoomData();
  }, [fetchWarRoomData]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const activitiesChannel = supabase
      .channel("war-room-activities")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activities",
        },
        (payload) => {
          const newActivity = payload.new as {
            id: string;
            user_id: string;
            activity_type: string;
            metadata: Record<string, unknown>;
            created_at: string;
          };

          // Find member name
          const member = teamMembers.find(m => m.user_id === newActivity.user_id);

          const activityItem: ActivityItem = {
            id: newActivity.id,
            user_id: newActivity.user_id,
            user_name: member?.full_name || "Team Member",
            user_avatar: member?.avatar_url || null,
            activity_type: newActivity.activity_type,
            metadata: newActivity.metadata || {},
            created_at: newActivity.created_at,
          };

          setActivities(prev => [activityItem, ...prev].slice(0, 50));

          // Trigger pulse for calls
          if (newActivity.activity_type === "call_made" || newActivity.activity_type === "call_received") {
            triggerPulse(newActivity.user_id);
          }

          // Trigger celebration for deals
          if (newActivity.activity_type === "deal_closed" && member) {
            const value = Number(newActivity.metadata?.deal_value || newActivity.metadata?.value || 0);
            const clientName = String(newActivity.metadata?.client_name || "");
            const dealType = String(newActivity.metadata?.deal_type || "");
            const dealsToday = (member.today_stats?.deals_closed || 0) + 1;
            
            triggerCelebration(
              newActivity.user_id, 
              member.full_name, 
              member.avatar_url,
              value,
              clientName,
              dealType,
              dealsToday
            );
          }

          // Refresh data to update stats
          fetchWarRoomData();
        }
      )
      .subscribe();

    const statusChannel = supabase
      .channel("war-room-status")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_status",
        },
        () => {
          fetchWarRoomData();
        }
      )
      .subscribe();

    const sosChannel = supabase
      .channel("war-room-sos")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sos_alerts",
        },
        (payload) => {
          // Show toast for new SOS alerts (for managers)
          if (payload.eventType === "INSERT") {
            const alert = payload.new as { user_id: string; alert_type: string };
            const member = teamMembers.find(m => m.user_id === alert.user_id);
            if (member) {
              toast.error(`🆘 ${member.full_name} needs help: ${alert.alert_type}`, {
                duration: 10000,
              });
            }
          }
          fetchWarRoomData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(activitiesChannel);
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(sosChannel);
    };
  }, [user, teamMembers, fetchWarRoomData, triggerPulse, triggerCelebration]);

  return {
    teamMembers,
    teamStats,
    activities,
    isLoading,
    pulsingMembers,
    celebratingMembers,
    celebrationData,
    showCelebration,
    closeCelebration,
    soundEnabled,
    refetch: fetchWarRoomData,
  };
}
