import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface GauntletChallenge {
  id: string;
  challenge_date: string;
  challenge_type: string;
  title: string;
  description: string;
  content: Json;
  time_limit_seconds: number;
  xp_reward: number;
}

export interface GauntletCompletion {
  id: string;
  user_id: string;
  challenge_id: string;
  score: number;
  passed: boolean;
  attempts: number;
  responses: Json;
  feedback: Json;
  completed_at: string;
}

export interface EvaluationResult {
  scores: Array<{ score: number; feedback: string }>;
  averageScore: number;
  passed: boolean;
  overallFeedback: string;
  completion_id?: string;
  xp_award?: { awarded: boolean; amount: number };
  already_completed?: boolean;
}

export function useGauntlet() {
  const { user } = useAuth();
  const [todayChallenge, setTodayChallenge] = useState<GauntletChallenge | null>(null);
  const [todayCompletion, setTodayCompletion] = useState<GauntletCompletion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [streak, setStreak] = useState(0);

  const fetchTodayChallenge = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: challenge, error } = await supabase
        .from('gauntlet_challenges')
        .select('*')
        .eq('challenge_date', today)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching challenge:", error);
      }
      setTodayChallenge(challenge);
    } catch (error) {
      console.error("Error:", error);
    }
  }, []);

  const fetchTodayCompletion = useCallback(async () => {
    if (!user || !todayChallenge) return;
    try {
      const { data: completion, error } = await supabase
        .from('user_gauntlet_completions')
        .select('*')
        .eq('user_id', user.id)
        .eq('challenge_id', todayChallenge.id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching completion:", error);
      }
      setTodayCompletion(completion);
    } catch (error) {
      console.error("Error:", error);
    }
  }, [user, todayChallenge]);

  const calculateStreak = useCallback(async () => {
    if (!user) return;
    try {
      const { data: completions, error } = await supabase
        .from('user_gauntlet_completions')
        .select(`*, gauntlet_challenges!inner(challenge_date)`)
        .eq('user_id', user.id)
        .eq('passed', true)
        .order('completed_at', { ascending: false });
      if (error) throw error;
      if (!completions?.length) { setStreak(0); return; }
      let currentStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let i = 0; i < completions.length; i++) {
        const challengeDate = new Date((completions[i].gauntlet_challenges as { challenge_date: string }).challenge_date);
        challengeDate.setHours(0, 0, 0, 0);
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - i);
        expectedDate.setHours(0, 0, 0, 0);
        if (challengeDate.getTime() === expectedDate.getTime()) currentStreak++;
        else break;
      }
      setStreak(currentStreak);
    } catch (error) {
      console.error("Error calculating streak:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchTodayChallenge().finally(() => setIsLoading(false));
  }, [fetchTodayChallenge]);

  useEffect(() => {
    if (todayChallenge) fetchTodayCompletion();
  }, [todayChallenge, fetchTodayCompletion]);

  useEffect(() => { calculateStreak(); }, [calculateStreak]);

  // Server-scored + server-persisted. Client only submits raw responses;
  // the edge function loads challenge content, calls AI, validates output,
  // writes the completion row, and mints the XP ledger entry.
  const submitChallenge = async (responses: unknown[]): Promise<EvaluationResult | null> => {
    if (!todayChallenge) return null;
    setIsEvaluating(true);
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-gauntlet", {
        body: { action: "evaluate", challengeId: todayChallenge.id, responses },
      });
      if (error) {
        toast.error("Failed to evaluate responses");
        return null;
      }
      const result = data as EvaluationResult;
      if (result?.passed && result.xp_award?.awarded && result.xp_award.amount > 0) {
        toast.success(`+${result.xp_award.amount} XP earned!`);
      }
      await fetchTodayCompletion();
      await calculateStreak();
      return result;
    } catch (error) {
      console.error("Evaluation error:", error);
      toast.error("Failed to evaluate responses");
      return null;
    } finally {
      setIsEvaluating(false);
    }
  };

  const skipChallenge = async (): Promise<void> => {
    if (!user || !todayChallenge) return;
    try {
      const { error } = await supabase.functions.invoke("evaluate-gauntlet", {
        body: { action: "skip", challengeId: todayChallenge.id },
      });
      if (error) throw error;
      await fetchTodayCompletion();
      toast.info("Challenge skipped. Your streak has been reset.");
    } catch (error) {
      console.error("Error skipping:", error);
      toast.error("Could not skip challenge");
    }
  };

  return {
    todayChallenge,
    todayCompletion,
    isLoading,
    isEvaluating,
    streak,
    hasCompletedToday: !!todayCompletion,
    hasPassed: todayCompletion?.passed ?? false,
    submitChallenge,
    skipChallenge,
    refetch: fetchTodayChallenge,
  };
}
