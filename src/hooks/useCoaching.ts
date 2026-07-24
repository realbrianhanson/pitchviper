import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import {
  sanitizeSessionDraft,
  isCoachingActionStatus,
  canRepAdvanceStatus,
  type CoachingSessionDraft,
  type CoachingActionStatus,
} from "@/lib/coachingValidation";

export interface CoachingSession {
  id: string;
  manager_id: string;
  rep_id: string;
  team_id: string | null;
  notes: string;
  focus_areas: string[] | null;
  action_items: string[] | null;
  due_date: string | null;
  status: string;
  completed_at: string | null;
  next_session_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoachingAction {
  id: string;
  session_id: string;
  team_id: string;
  rep_id: string;
  assigned_by: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: CoachingActionStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
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
  focus_areas: Array<{ area: string; reason: string; action: string }>;
  conversation_starters: string[];
  recognition_points: string[];
  suggested_roleplay: { scenario_type: string; reason: string } | null;
  performance_insights: {
    trend: "improving" | "declining" | "steady";
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

const GENERIC_SAVE_ERR = "Couldn't save coaching session. Please try again.";
const GENERIC_STATUS_ERR = "Couldn't update action status. Please try again.";

export function useCoaching() {
  const { user, profile, canManageTeam } = useAuth();
  const queryClient = useQueryClient();

  const { data: teamMembers = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ["coaching-team-members", profile?.team_id],
    queryFn: async () => {
      if (!profile?.team_id) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "user_id, full_name, avatar_url, title, hire_date, current_level, xp_points, current_streak, longest_streak, last_coached_at, team_id"
        )
        .eq("team_id", profile.team_id)
        .neq("user_id", user?.id ?? "");
      if (error) throw error;
      return (data || []) as RepCoachingProfile[];
    },
    // Only managers see the roster; reps calling MyCoachingActions never fetch it.
    enabled: !!profile?.team_id && !!user && canManageTeam,
  });

  const useRepCoachingSessions = (repId: string | null) =>
    useQuery({
      queryKey: ["coaching-sessions", repId],
      queryFn: async () => {
        if (!repId) return [];
        const { data, error } = await supabase
          .from("coaching_sessions")
          .select("*")
          .eq("rep_id", repId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []) as CoachingSession[];
      },
      // Manager-only view of another rep's history.
      enabled: !!repId && canManageTeam,
    });

  const useRepCoachingActions = (repId: string | null) =>
    useQuery({
      queryKey: ["coaching-actions", repId],
      queryFn: async () => {
        if (!repId) return [];
        const { data, error } = await supabase
          .from("coaching_actions")
          .select("*")
          .eq("rep_id", repId)
          .order("status", { ascending: true })
          .order("due_date", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []) as CoachingAction[];
      },
      enabled: !!repId && canManageTeam,
    });

  const useMyCoachingActions = () =>
    useQuery({
      queryKey: ["my-coaching-actions", user?.id],
      queryFn: async () => {
        if (!user?.id) return [];
        const { data, error } = await supabase
          .from("coaching_actions")
          .select("*")
          .eq("rep_id", user.id)
          .order("status", { ascending: true })
          .order("due_date", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []) as CoachingAction[];
      },
      enabled: !!user?.id,
    });

  const useRepRecentCalls = (repId: string | null) =>
    useQuery({
      queryKey: ["rep-recent-calls", repId],
      queryFn: async () => {
        if (!repId) return [];
        const { data, error } = await supabase
          .from("calls")
          .select("*")
          .eq("user_id", repId)
          .order("created_at", { ascending: false })
          .limit(10);
        if (error) throw error;
        return data || [];
      },
      enabled: !!repId && canManageTeam,
    });

  const useRepRoleplaySessions = (repId: string | null) =>
    useQuery({
      queryKey: ["rep-roleplay-sessions", repId],
      queryFn: async () => {
        if (!repId) return [];
        const { data, error } = await supabase
          .from("roleplay_sessions")
          .select("*, roleplay_scenarios(name, difficulty)")
          .eq("user_id", repId)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(5);
        if (error) throw error;
        return data || [];
      },
      enabled: !!repId && canManageTeam,
    });

  const useRepRecentBadges = (repId: string | null) =>
    useQuery({
      queryKey: ["rep-recent-badges", repId],
      queryFn: async () => {
        if (!repId) return [];
        const { data, error } = await supabase
          .from("user_badges")
          .select("*, badges(*)")
          .eq("user_id", repId)
          .order("earned_at", { ascending: false })
          .limit(5);
        if (error) throw error;
        return data || [];
      },
      enabled: !!repId && canManageTeam,
    });

  const useCoachingInsights = (repId: string | null) =>
    useQuery({
      queryKey: ["coaching-insights", repId],
      queryFn: async () => {
        if (!repId) return null;
        const { data, error } = await supabase.functions.invoke("generate-coaching-insights", {
          body: { rep_id: repId },
        });
        if (error) throw error;
        if (!data.success) throw new Error(data.error);
        return {
          insights: data.insights as CoachingInsights,
          stats: data.stats as RepStats,
        };
      },
      enabled: !!repId && canManageTeam,
      staleTime: 5 * 60 * 1000,
    });

  const saveCoachingSession = useMutation({
    mutationFn: async (draft: CoachingSessionDraft) => {
      if (!user) throw new Error("not_authenticated");
      if (!canManageTeam) throw new Error("forbidden");

      const sanitized = sanitizeSessionDraft(draft);
      if (sanitized.ok !== true) throw new Error(sanitized.error);
      const v = sanitized.value;

      const { data, error } = await supabase.rpc("create_coaching_session_with_actions", {
        p_rep_id: v.rep_id,
        p_notes: v.notes,
        p_focus_areas: v.focus_areas,
        p_actions: v.actions as unknown as never,
        p_due_date: v.due_date,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["coaching-sessions", variables.rep_id] });
      queryClient.invalidateQueries({ queryKey: ["coaching-actions", variables.rep_id] });
      queryClient.invalidateQueries({ queryKey: ["coaching-team-members"] });
      queryClient.invalidateQueries({ queryKey: ["manager-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["my-coaching-actions"] });
      toast.success("Coaching session saved");
    },
    onError: (error) => {
      const msg =
        error instanceof Error && /required|too long|too many|Select|valid date|Limit|action item/i.test(error.message)
          ? error.message
          : GENERIC_SAVE_ERR;
      console.error("[useCoaching] saveCoachingSession", error);
      toast.error(msg);
    },
  });

  const updateActionStatus = useMutation({
    mutationFn: async (input: {
      action_id: string;
      status: CoachingActionStatus;
      current_status?: CoachingActionStatus;
    }) => {
      if (!user) throw new Error("not_authenticated");
      if (!isCoachingActionStatus(input.status)) throw new Error("invalid_status");
      // Client-side belt for reps: block reopen/backward moves before hitting the RPC.
      // The RPC is still authoritative and enforces the same rule server-side.
      if (
        !canManageTeam &&
        input.current_status &&
        !canRepAdvanceStatus(input.current_status, input.status)
      ) {
        throw new Error("forbidden");
      }
      const { data, error } = await supabase.rpc("update_coaching_action_status", {
        p_action_id: input.action_id,
        p_status: input.status,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-actions"] });
      queryClient.invalidateQueries({ queryKey: ["my-coaching-actions"] });
      queryClient.invalidateQueries({ queryKey: ["manager-dashboard"] });
    },
    onError: (error) => {
      console.error("[useCoaching] updateActionStatus", error);
      toast.error(GENERIC_STATUS_ERR);
    },
  });

  return {
    teamMembers,
    isLoadingMembers,
    useRepCoachingSessions,
    useRepCoachingActions,
    useMyCoachingActions,
    useRepRecentCalls,
    useRepRoleplaySessions,
    useRepRecentBadges,
    useCoachingInsights,
    saveCoachingSession,
    updateActionStatus,
    canManageTeam,
  };
}
