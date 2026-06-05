import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TickerStats {
  callsToday: number;
  appts: number;
  revenue: number;
  connectRate: number;
  streak: number;
}

export function useTickerStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TickerStats | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const fetchStats = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [{ data: ds }, { data: pf }] = await Promise.all([
        supabase
          .from("daily_stats")
          .select("calls_made, calls_received, appointments_set, revenue_closed")
          .eq("user_id", user.id)
          .eq("date", today)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("current_streak")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      const callsMade = ds?.calls_made || 0;
      const callsReceived = ds?.calls_received || 0;
      const total = callsMade + callsReceived;
      const appts = ds?.appointments_set || 0;

      setStats({
        callsToday: callsMade,
        appts,
        revenue: Number(ds?.revenue_closed || 0),
        connectRate: total > 0 ? Math.round((appts / total) * 100) : 0,
        streak: pf?.current_streak || 0,
      });
    };

    fetchStats();
    const id = setInterval(fetchStats, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user?.id]);

  return stats;
}
