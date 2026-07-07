import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { fireConfetti, BRAND_CONFETTI_VICTORY } from "@/lib/confetti";

interface DashboardProfile {
  full_name: string;
  avatar_url: string | null;
  title: string | null;
  xp_points: number;
  current_level: number;
  current_streak: number;
  team: { id: string; name: string } | null;
}

interface DailyStats {
  calls_made: number;
  calls_received: number;
  appointments_set: number;
  deals_closed: number;
  deals_lost: number;
  revenue_closed: number;
  talk_time_minutes: number;
}

interface Activity {
  id: string;
  type: string;
  metadata: Record<string, any>;
  created_at: string;
  user: { name: string; avatar_url: string | null } | null;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  target: number;
  xp_reward: number;
  progress: number;
  completed: boolean;
}

interface TeamMember {
  rank: number;
  user_id: string;
  name: string;
  avatar_url: string | null;
  calls_made: number;
  revenue_closed: number;
}

interface DashboardData {
  profile: DashboardProfile;
  todayStats: DailyStats;
  yesterdayStats: DailyStats | null;
  activities: Activity[];
  challenge: Challenge | null;
  teamLeaderboard: TeamMember[] | null;
}

export function useDashboardData() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!session?.access_token) return;

    try {
      const response = await supabase.functions.invoke("get-dashboard-data", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setData(response.data);
      setError(null);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  // Initial fetch
  useEffect(() => {
    if (session?.access_token) {
      fetchData();
    }
  }, [session?.access_token, fetchData]);

  // Real-time subscription for activities
  useEffect(() => {
    if (!user || !data?.profile?.team?.id) return;

    const channel = supabase
      .channel("activities-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activities",
          filter: data.profile.team 
            ? `team_id=eq.${data.profile.team.id}` 
            : `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newActivity = payload.new as any;

          // Don't show notification for own activities
          if (newActivity.user_id === user.id) {
            // Just refresh data
            fetchData();
            return;
          }

          // Get user info for the activity
          const { data: activityUser } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", newActivity.user_id)
            .maybeSingle();

          // Add to activities list
          const formattedActivity: Activity = {
            id: newActivity.id,
            type: newActivity.activity_type,
            metadata: newActivity.metadata || {},
            created_at: newActivity.created_at,
            user: activityUser
              ? { name: activityUser.full_name, avatar_url: activityUser.avatar_url }
              : null,
          };

          setData((prev) =>
            prev
              ? {
                  ...prev,
                  activities: [formattedActivity, ...prev.activities.slice(0, 19)],
                }
              : prev
          );

          // Show celebration for deal closed
          if (newActivity.activity_type === "deal_closed") {
            const value = newActivity.metadata?.value;
            const userName = activityUser?.full_name?.split(" ")[0] || "A teammate";

            // Fire confetti
            fireConfetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: BRAND_CONFETTI_VICTORY,
            });

            toast({
              title: "🎉 Deal Closed!",
              description: `${userName} just closed a deal${value ? ` worth $${Number(value).toLocaleString()}` : ""}!`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, data?.profile?.team?.id, toast, fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Helper to format activity descriptions
export function formatActivityDescription(activity: Activity): string {
  const { type, metadata, user } = activity;
  const userName = user?.name?.split(" ")[0] || "You";
  const isOwn = !user;

  switch (type) {
    case "call_made":
      return isOwn
        ? `Made a call to ${metadata.company || "a prospect"}`
        : `${userName} made a call to ${metadata.company || "a prospect"}`;
    case "call_received":
      return isOwn
        ? `Received a call from ${metadata.company || "a contact"}`
        : `${userName} received a call`;
    case "appointment_set":
      return isOwn
        ? `Scheduled appointment with ${metadata.company || "a prospect"}`
        : `${userName} scheduled an appointment`;
    case "deal_closed":
      const value = metadata.value ? ` worth $${Number(metadata.value).toLocaleString()}` : "";
      return isOwn
        ? `Closed deal with ${metadata.company || "a client"}${value}`
        : `${userName} closed a deal${value}`;
    case "deal_lost":
      return isOwn
        ? `Lost deal with ${metadata.company || "a prospect"}`
        : `${userName} lost a deal`;
    case "roleplay_completed":
      return isOwn
        ? `Completed a roleplay session`
        : `${userName} completed roleplay`;
    case "badge_earned":
      return isOwn
        ? `Earned the "${metadata.badge_name || "Achievement"}" badge`
        : `${userName} earned a badge`;
    case "level_up":
      return isOwn
        ? `Leveled up to Level ${metadata.new_level || "?"}!`
        : `${userName} leveled up!`;
    case "training_completed":
      return isOwn
        ? `Completed training: ${metadata.training_name || "a module"}`
        : `${userName} completed training`;
    default:
      return isOwn ? "Completed an action" : `${userName} completed an action`;
  }
}