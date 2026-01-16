import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface RoleplayScenario {
  id: string;
  name: string;
  description: string;
  difficulty: "rookie" | "pro" | "expert" | "nightmare";
  prospect_persona: string;
  prospect_situation: string;
  win_conditions: string[];
  objections_to_include: string[];
  estimated_minutes: number;
  xp_reward: number;
  sort_order: number;
}

export interface RoleplaySession {
  id: string;
  user_id: string;
  scenario_id: string;
  status: "in_progress" | "completed" | "abandoned";
  transcript: Array<{ role: string; content: string }>;
  score: number | null;
  feedback: string | null;
  duration_seconds: number | null;
  started_at: string;
  completed_at: string | null;
}

export interface UserRoleplayStats {
  total_sessions: number;
  completed_sessions: number;
  win_rate: number;
  total_xp_earned: number;
  best_scores: Map<string, number>;
}

export function useRoleplayData() {
  const { user } = useAuth();
  const [scenarios, setScenarios] = useState<RoleplayScenario[]>([]);
  const [userStats, setUserStats] = useState<UserRoleplayStats>({
    total_sessions: 0,
    completed_sessions: 0,
    win_rate: 0,
    total_xp_earned: 0,
    best_scores: new Map(),
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // Fetch scenarios
      const { data: scenariosData, error: scenariosError } = await supabase
        .from("roleplay_scenarios")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (scenariosError) throw scenariosError;

      setScenarios(scenariosData as RoleplayScenario[]);

      // Fetch user sessions if logged in
      if (user) {
        const { data: sessionsData, error: sessionsError } = await supabase
          .from("roleplay_sessions")
          .select("*")
          .eq("user_id", user.id);

        if (sessionsError) throw sessionsError;

        const sessions = sessionsData as RoleplaySession[];
        const completedSessions = sessions.filter(s => s.status === "completed");
        const wins = completedSessions.filter(s => (s.score || 0) >= 70);
        
        // Calculate best scores per scenario
        const bestScores = new Map<string, number>();
        sessions.forEach(session => {
          if (session.score !== null) {
            const current = bestScores.get(session.scenario_id) || 0;
            if (session.score > current) {
              bestScores.set(session.scenario_id, session.score);
            }
          }
        });

        // Calculate total XP earned
        let totalXp = 0;
        completedSessions.forEach(session => {
          const scenario = scenariosData?.find(s => s.id === session.scenario_id);
          if (scenario && (session.score || 0) >= 70) {
            totalXp += scenario.xp_reward;
          }
        });

        setUserStats({
          total_sessions: sessions.length,
          completed_sessions: completedSessions.length,
          win_rate: completedSessions.length > 0 
            ? Math.round((wins.length / completedSessions.length) * 100) 
            : 0,
          total_xp_earned: totalXp,
          best_scores: bestScores,
        });
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching roleplay data:", error);
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    scenarios,
    userStats,
    isLoading,
    refetch: fetchData,
  };
}
