import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Sparkles, TrendingUp, Lightbulb, Target, RefreshCw, AlertCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface RepInsight {
  user_id: string;
  full_name: string;
  metrics: {
    calls_30d: number;
    contacts_created_30d: number;
    opportunities_won_30d: number;
    stage_changes_30d: number;
    win_rate: number;
    roleplay_sessions_30d: number;
    avg_roleplay_score: number | null;
    best_roleplay_score: number | null;
  };
  whats_working: string;
  to_improve: string;
  weekly_focus: string;
}

type LoadState = "idle" | "loading" | "error" | "ready";

export default function AICoachInsightsPage() {
  const { user, isManager, loading: authLoading } = useAuth();
  const [insights, setInsights] = useState<RepInsight[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!user) return;
    setState("loading");
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ai-coach-insights", {
        body: {},
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setInsights(data?.insights ?? []);
      setState("ready");
    } catch (err) {
      console.error("Coach insights error:", err);
      const message = err instanceof Error ? err.message : "Failed to load insights";
      setErrorMsg(message);
      setState("error");
      toast.error(message);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchInsights();
    }
  }, [authLoading, user, fetchInsights]);

  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const title = isManager ? "Team Coaching Insights" : "Your Coaching Insights";
  const subtitle = isManager
    ? "AI-powered coaching insights for each member of your team, based on the last 30 days of activity."
    : "AI-powered insights from your last 30 days of activity and roleplay sessions.";

  return (
    <AppLayout title="AI Coach Insights">
      <div className="animate-fade-in space-y-6">
        {/* Header */}
        <ViperCard variant="glass" className="gradient-border">
          <ViperCardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/15">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                  {title}
                  <Sparkles className="h-4 w-4 text-primary" />
                </h1>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>
              </div>
            </div>
            <ViperButton
              variant="outline"
              size="sm"
              onClick={fetchInsights}
              disabled={state === "loading"}
              className="gap-2 self-start md:self-auto"
            >
              <RefreshCw className={`h-4 w-4 ${state === "loading" ? "animate-spin" : ""}`} />
              Refresh
            </ViperButton>
          </ViperCardContent>
        </ViperCard>

        {/* Loading */}
        {state === "loading" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: isManager ? 4 : 1 }).map((_, i) => (
              <ViperCard key={i} variant="glass">
                <ViperCardHeader>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                </ViperCardHeader>
                <ViperCardContent className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </ViperCardContent>
              </ViperCard>
            ))}
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <ViperCard variant="glass">
            <ViperCardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4 opacity-80" />
              <h3 className="text-lg font-semibold mb-2">Couldn't load coaching insights</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                {errorMsg ?? "Something went wrong while generating insights. Please try again."}
              </p>
              <ViperButton onClick={fetchInsights} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </ViperButton>
            </ViperCardContent>
          </ViperCard>
        )}

        {/* Empty */}
        {state === "ready" && insights.length === 0 && (
          <ViperCard variant="glass">
            <ViperCardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-60" />
              <h3 className="text-lg font-semibold mb-2">No insights yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {isManager
                  ? "Your team doesn't have any tracked activity yet. Once reps start making calls and running roleplays, insights will appear here."
                  : "We need some activity to coach you. Make a few calls and run a roleplay scenario, then come back."}
              </p>
            </ViperCardContent>
          </ViperCard>
        )}

        {/* Ready */}
        {state === "ready" && insights.length > 0 && (
          <div className={`grid grid-cols-1 ${insights.length > 1 ? "lg:grid-cols-2" : ""} gap-4`}>
            {insights.map((rep) => (
              <ViperCard key={rep.user_id} variant="glass">
                <ViperCardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-primary/30">
                        <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                          {initials(rep.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <ViperCardTitle className="text-base">{rep.full_name}</ViperCardTitle>
                        <p className="text-xs text-muted-foreground">Last 30 days</p>
                      </div>
                    </div>
                  </div>

                  {/* Metric chips */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <MetricChip label="Calls" value={rep.metrics.calls_30d} />
                    <MetricChip label="Won" value={rep.metrics.opportunities_won_30d} />
                    <MetricChip label="Win rate" value={`${rep.metrics.win_rate}%`} />
                    <MetricChip label="Roleplays" value={rep.metrics.roleplay_sessions_30d} />
                    {rep.metrics.avg_roleplay_score !== null && (
                      <MetricChip label="Avg score" value={rep.metrics.avg_roleplay_score} />
                    )}
                  </div>
                </ViperCardHeader>

                <ViperCardContent className="space-y-3">
                  <InsightRow
                    icon={<TrendingUp className="h-4 w-4 text-success" />}
                    label="What's working"
                    text={rep.whats_working}
                    tone="success"
                  />
                  <InsightRow
                    icon={<Lightbulb className="h-4 w-4 text-warning" />}
                    label="To improve"
                    text={rep.to_improve}
                    tone="warning"
                  />
                  <InsightRow
                    icon={<Target className="h-4 w-4 text-primary" />}
                    label="This week's focus"
                    text={rep.weekly_focus}
                    tone="primary"
                  />
                </ViperCardContent>
              </ViperCard>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function MetricChip({ label, value }: { label: string; value: number | string }) {
  return (
    <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-background/60 border border-border/50 text-muted-foreground">
      <span className="font-mono text-foreground">{value}</span> <span>{label}</span>
    </span>
  );
}

function InsightRow({
  icon,
  label,
  text,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
  tone: "success" | "warning" | "primary";
}) {
  const toneClasses = {
    success: "bg-success/10 border-success/20",
    warning: "bg-warning/10 border-warning/20",
    primary: "bg-primary/10 border-primary/20",
  }[tone];

  return (
    <div className={`p-3 rounded-lg border ${toneClasses}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">{label}</span>
      </div>
      <p className="text-sm text-foreground/90 leading-relaxed">{text}</p>
    </div>
  );
}
