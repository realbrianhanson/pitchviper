import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

interface GhlRow {
  event_type: string;
  value: number | null;
  occurred_at: string;
  payload: Record<string, unknown> | null;
}

/**
 * Best-effort dedupe key for an opportunity event.
 * GHL payloads in this project don't carry a canonical opportunity_id, so we
 * fall back through several common field names before using the human-readable
 * `note` (e.g. "Globex to Proposal") as a last-resort key.
 */
function opportunityKey(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  const p = payload as Record<string, unknown>;
  const candidates = [
    p.opportunity_id,
    p.opportunityId,
    (p.opportunity as Record<string, unknown> | undefined)?.id,
    p.id,
    p.deal_id,
    p.dealId,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
    if (typeof c === "number") return String(c);
  }
  const note = typeof p.note === "string" ? p.note.trim() : "";
  return note ? `note:${note.toLowerCase()}` : null;
}

function computeStats(rows: GhlRow[]): GhlStats {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayIdx = (now.getDay() + 6) % 7;
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - dayIdx);

  let callsToday = 0;
  let dealsWonThisWeek = 0;
  let revenueWonThisWeek = 0;
  const activeDays = new Set<string>();

  // Distinct open-opportunity tracking
  const stagedOpps = new Set<string>();
  const closedOpps = new Set<string>();

  for (const row of rows) {
    const occurred = new Date(row.occurred_at);
    activeDays.add(occurred.toISOString().slice(0, 10));

    if (row.event_type === "call" && occurred >= startOfToday) {
      callsToday++;
    }

    if (row.event_type === "opportunity_stage_changed") {
      const key = opportunityKey(row.payload);
      if (key) stagedOpps.add(key);
    }

    if (row.event_type === "opportunity_won" || row.event_type === "opportunity_lost") {
      const key = opportunityKey(row.payload);
      if (key) closedOpps.add(key);

      if (row.event_type === "opportunity_won" && occurred >= startOfWeek) {
        dealsWonThisWeek++;
        revenueWonThisWeek += Number(row.value || 0);
      }
    }
  }

  // Open opportunities = staged minus closed
  let dealsInPipeline = 0;
  for (const k of stagedOpps) if (!closedOpps.has(k)) dealsInPipeline++;

  // Streak
  let streak = 0;
  const cursor = new Date(startOfToday);
  if (!activeDays.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (activeDays.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    callsToday,
    dealsInPipeline,
    dealsWonThisWeek,
    revenueWonThisWeek,
    currentStreak: streak,
  };
}

async function fetchGhlStats(userId: string): Promise<GhlStats> {
  const since = new Date();
  since.setDate(since.getDate() - 60);

  const { data, error } = await supabase
    .from("ghl_activities")
    .select("event_type, value, occurred_at, payload")
    .eq("matched_user_id", userId)
    .gte("occurred_at", since.toISOString())
    .order("occurred_at", { ascending: false });

  if (error) throw error;
  return computeStats((data ?? []) as GhlRow[]);
}

export function useGhlStats() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ["ghl-stats", userId],
    queryFn: () => fetchGhlStats(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Single shared realtime subscription invalidates the cache for all consumers
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`ghl_activities_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ghl_activities",
          filter: `matched_user_id=eq.${userId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["ghl-stats", userId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return {
    stats: query.data ?? EMPTY,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  };
}
