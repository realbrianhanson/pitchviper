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
      // Get all completions ordered by date
      const { data: completions, error } = await supabase
        .from('user_gauntlet_completions')
        .select(`
          *,
          gauntlet_challenges!inner(challenge_date)
        `)
        .eq('user_id', user.id)
        .eq('passed', true)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      if (!completions?.length) {
        setStreak(0);
        return;
      }

      // Calculate streak
      let currentStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < completions.length; i++) {
        const challengeDate = new Date((completions[i].gauntlet_challenges as { challenge_date: string }).challenge_date);
        challengeDate.setHours(0, 0, 0, 0);
        
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - i);
        expectedDate.setHours(0, 0, 0, 0);

        if (challengeDate.getTime() === expectedDate.getTime()) {
          currentStreak++;
        } else {
          break;
        }
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
    if (todayChallenge) {
      fetchTodayCompletion();
    }
  }, [todayChallenge, fetchTodayCompletion]);

  useEffect(() => {
    calculateStreak();
  }, [calculateStreak]);

  const evaluateResponses = async (
    responses: unknown[]
  ): Promise<EvaluationResult | null> => {
    if (!todayChallenge) return null;

    setIsEvaluating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evaluate-gauntlet`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            challengeType: todayChallenge.challenge_type,
            responses,
            challengeContent: todayChallenge.content,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Evaluation failed");
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Evaluation error:", error);
      toast.error("Failed to evaluate responses");
      return null;
    } finally {
      setIsEvaluating(false);
    }
  };

  const submitCompletion = async (
    responses: unknown[],
    evaluation: EvaluationResult
  ): Promise<boolean> => {
    if (!user || !todayChallenge) return false;

    try {
      const { data: existing } = await supabase
        .from('user_gauntlet_completions')
        .select('id, attempts')
        .eq('user_id', user.id)
        .eq('challenge_id', todayChallenge.id)
        .single();

      if (existing) {
        // Update existing attempt
        const { error } = await supabase
          .from('user_gauntlet_completions')
          .update({
            score: evaluation.averageScore,
            passed: evaluation.passed,
            attempts: existing.attempts + 1,
            responses: responses as Json,
            feedback: evaluation as unknown as Json,
            completed_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new completion
        const { error } = await supabase
          .from('user_gauntlet_completions')
          .insert({
            user_id: user.id,
            challenge_id: todayChallenge.id,
            score: evaluation.averageScore,
            passed: evaluation.passed,
            attempts: 1,
            responses: responses as Json,
            feedback: evaluation as unknown as Json,
          });

        if (error) throw error;
      }

      // Award XP if passed
      if (evaluation.passed) {
        const bonusXp = evaluation.averageScore === 100 ? 25 : 0;
        const totalXp = todayChallenge.xp_reward + bonusXp;

        // Fetch current XP and update
        const { data: profile } = await supabase
          .from('profiles')
          .select('xp_points')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({ xp_points: (profile.xp_points || 0) + totalXp })
            .eq('user_id', user.id);
        }

        toast.success(`+${totalXp} XP earned!`);
      }

      await fetchTodayCompletion();
      await calculateStreak();
      return true;
    } catch (error) {
      console.error("Error submitting completion:", error);
      toast.error("Failed to save completion");
      return false;
    }
  };

  const skipChallenge = async (): Promise<void> => {
    if (!user || !todayChallenge) return;

    try {
      await supabase
        .from('user_gauntlet_completions')
        .insert({
          user_id: user.id,
          challenge_id: todayChallenge.id,
          score: 0,
          passed: false,
          attempts: 0,
          responses: {},
          feedback: { skipped: true },
        });

      await fetchTodayCompletion();
      toast.info("Challenge skipped. Your streak has been reset.");
    } catch (error) {
      console.error("Error skipping:", error);
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
    evaluateResponses,
    submitCompletion,
    skipChallenge,
    refetch: fetchTodayChallenge,
  };
}
