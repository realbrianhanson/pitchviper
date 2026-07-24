import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface UnfinishedRow {
  id: string;
  scenario_id: string;
  started_at: string;
  roleplay_scenarios: { name: string } | null;
}

export function UnfinishedSessionPrompt() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["unfinished-roleplay", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<UnfinishedRow | null> => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("roleplay_sessions")
        .select("id, scenario_id, started_at, roleplay_scenarios(name)")
        .eq("user_id", user!.id)
        .eq("status", "in_progress")
        .gte("started_at", since)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as UnfinishedRow) ?? null;
    },
  });

  if (!data) return null;

  const startedAgo = (() => {
    const mins = Math.max(1, Math.floor((Date.now() - new Date(data.started_at).getTime()) / 60_000));
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  })();

  const handleResume = () => {
    navigate(`/roleplay/${data.scenario_id}?resume=${data.id}`);
  };

  const handleAbandon = async () => {
    const { error } = await supabase.functions.invoke("roleplay-abandon-session", {
      body: { session_id: data.id },
    });
    if (error) {
      toast.error("Could not close session");
      return;
    }
    toast.success("Session abandoned");
    queryClient.invalidateQueries({ queryKey: ["unfinished-roleplay", user?.id] });
  };

  const scenarioName = data.roleplay_scenarios?.name ?? "your last scenario";

  return (
    <div className="editorial-tile border border-border bg-card p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div>
        <p className="eyebrow font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 mb-2">
          — Unfinished Session
        </p>
        <h2 className="font-display italic text-2xl md:text-3xl leading-tight">
          You walked away mid-pitch on <span className="not-italic">{scenarioName}</span>.
        </h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 mt-2">
          Started {startedAgo}
        </p>
      </div>
      <div className="flex items-center gap-6 shrink-0">
        <button
          type="button"
          onClick={handleAbandon}
          className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition-colors"
        >
          Abandon
        </button>
        <button
          type="button"
          onClick={handleResume}
          className="gold-underline font-mono text-[11px] uppercase tracking-[0.3em] text-primary"
        >
          Resume →
        </button>
      </div>
    </div>
  );
}
