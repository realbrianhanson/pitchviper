import { Brain, TrendingUp, Target, Users, RefreshCw, AlertCircle } from "lucide-react";
import { ManagerInsights } from "@/hooks/useManagerDashboard";
import { cn } from "@/lib/utils";

interface AITeamInsightsProps {
  insights: ManagerInsights | null;
  isLoading: boolean;
  onRefresh: () => void;
}

function InsightRow({
  icon: Icon,
  label,
  accent,
  children,
}: {
  icon: typeof TrendingUp;
  label: string;
  accent: "primary" | "warning" | "destructive" | "success";
  children: React.ReactNode;
}) {
  const accentText =
    accent === "primary"
      ? "text-primary"
      : accent === "warning"
      ? "text-warning"
      : accent === "destructive"
      ? "text-destructive"
      : "text-success";

  return (
    <div className="py-5 first:pt-0 last:pb-0 border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-3.5 w-3.5", accentText)} />
        <span className={cn("font-mono text-[10px] uppercase tracking-[0.2em]", accentText)}>
          {label}
        </span>
      </div>
      <div className="text-sm text-foreground/90">{children}</div>
    </div>
  );
}

export function AITeamInsights({ insights, isLoading, onRefresh }: AITeamInsightsProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" strokeWidth={1.5} />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
            AI Team Insights
          </span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh AI insights"
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {isLoading ? (
        <div className="divide-y divide-border">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="py-5 first:pt-0 animate-pulse">
              <div className="h-2.5 w-24 bg-muted mb-3" />
              <div className="h-3 w-full bg-muted mb-1.5" />
              <div className="h-3 w-3/4 bg-muted" />
            </div>
          ))}
        </div>
      ) : !insights ? (
        <div className="text-center py-10">
          <Brain className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" strokeWidth={1.5} />
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
            No insights yet
          </p>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
            Check back after your team has some activity.
          </p>
        </div>
      ) : (
        <div>
          <InsightRow icon={TrendingUp} label="This week's trend" accent="primary">
            {insights.team_trend || "No trend data available yet."}
          </InsightRow>

          {insights.coaching_opportunity && (
            <InsightRow icon={Target} label="Top coaching opportunity" accent="warning">
              <p className="mb-1">
                <span className="font-semibold">{insights.coaching_opportunity.rep_name}</span>
                {" — "}
                {insights.coaching_opportunity.reason}
              </p>
              <p className="text-xs text-muted-foreground">
                Focus on: {insights.coaching_opportunity.suggested_focus}
              </p>
            </InsightRow>
          )}

          {insights.skill_gap && (
            <InsightRow icon={AlertCircle} label="Skill gap detected" accent="destructive">
              <p className="mb-1">{insights.skill_gap.gap}</p>
              <p className="text-xs text-muted-foreground">
                Affects {insights.skill_gap.affected_count} reps · {insights.skill_gap.recommendation}
              </p>
            </InsightRow>
          )}

          {insights.quota_prediction && (
            <InsightRow icon={Users} label="Quota attainment prediction" accent="success">
              <div className="flex items-baseline gap-3 mb-1">
                <span
                  className={cn(
                    "font-display text-3xl tabular-nums leading-none",
                    insights.quota_prediction.percentage >= 90
                      ? "text-success"
                      : insights.quota_prediction.percentage >= 70
                      ? "text-warning"
                      : "text-destructive"
                  )}
                >
                  {insights.quota_prediction.percentage}%
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                  {insights.quota_prediction.confidence} confidence
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {insights.quota_prediction.factors}
              </p>
            </InsightRow>
          )}
        </div>
      )}
    </div>
  );
}
