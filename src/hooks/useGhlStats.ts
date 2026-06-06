import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface GhlStats {
  callsToday: number;
  dealsInPipeline: number;
  dealsWonThisWeek: number;
  revenueWonThisWeek: number;
  currentStreak: number;
}

const EMPTY: GhlStats = {
  callsToday: 0,
  dealsInPipeline: 0,
  dealsWonThisWeek: 0,
  revenueWonThisWeek: 0,
  currentStreak: 0,
};

export function useGhlStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<GhlStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setStats(EMPTY);
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      const since = new Date();
      since.setDate(since.getDate() - 60);

      const { data, error } = await supabase
        .from("ghl_activities")
        .select("event_type, value, occurred_at")
        .eq("matched_user_id", user.id)
        .gte("occurred_at", since.toISOString())
        .order("occurred_at", { ascending: false });

      if (!active) return;
      if (error || !data) {
        setStats(EMPTY);
        setLoading(false);
        return;
      }

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      // Start of week (Monday)
      const dayIdx = (now.getDay() + 6) % 7;
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfToday.getDate() - dayIdx);

      let callsToday = 0;
      let dealsInPipeline = 0;
      let dealsWonThisWeek = 0;
      let revenueWonThisWeek = 0;
      const activeDays = new Set<string>();

      for (const row of data) {
        const occurred = new Date(row.occurred_at);
        activeDays.add(occurred.toISOString().slice(0, 10));

        if (row.event_type === "call" && occurred >= startOfToday) {
          callsToday++;
        }
        if (row.event_type === "opportunity_stage_changed") {
          dealsInPipeline++;
        }
        if (row.event_type === "opportunity_won" && occurred >= startOfWeek) {
          dealsWonThisWeek++;
          revenueWonThisWeek += Number(row.value || 0);
        }
      }

      // Streak: consecutive days ending today (or yesterday) with any activity
      let streak = 0;
      const cursor = new Date(startOfToday);
      if (!activeDays.has(cursor.toISOString().slice(0, 10))) {
        cursor.setDate(cursor.getDate() - 1);
      }
      while (activeDays.has(cursor.toISOString().slice(0, 10))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }

      setStats({
        callsToday,
        dealsInPipeline,
        dealsWonThisWeek,
        revenueWonThisWeek,
        currentStreak: streak,
      });
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`ghl_activities_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ghl_activities",
          filter: `matched_user_id=eq.${user.id}`,
        },
        () => load(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return { stats, loading };
}
