import { Brain, TrendingUp, Target, Users, RefreshCw, AlertCircle, ArrowRight } from "lucide-react";
import { ManagerInsights } from "@/hooks/useManagerDashboard";
import { cn } from "@/lib/utils";

interface AITeamInsightsProps {
  insights: ManagerInsights | null;
  isLoading: boolean;
  onRefresh: () => void;
  /** Resolved same-team user_id for the top coaching opportunity, or null when
   * the AI-provided rep_name has no unambiguous match. Never accept an AI id. */
  coachingRepId?: string | null;
  onCoachRep?: (userId: string) => void;
}

type Accent = "primary" | "warning" | "destructive" | "success";

const iconTileClass = (accent: Accent) =>
  accent === "primary"
    ? "bg-primary/10 text-primary"
    : accent === "warning"
    ? "bg-warning/10 text-warning"
    : accent === "destructive"
    ? "bg-destructive/10 text-destructive"
    : "bg-success/10 text-success";

function InsightRow({
  icon: Icon,
  label,
  accent,
  children,
}: {
  icon: typeof TrendingUp;
  label: string;
  accent: Accent;
  children: React.ReactNode;
}) {
  return (
    <div className="py-4 first:pt-0 last:pb-0 border-b border-border last:border-b-0">
      <div className="flex items-center gap-2.5 mb-2">
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", iconTileClass(accent))}>
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <div className="text-sm text-foreground/85 pl-[38px]">{children}</div>
    </div>
  );
}

export function AITeamInsights({ insights, isLoading, onRefresh }: AITeamInsightsProps) {
  return (
    <div className="rounded-[12px] border border-border bg-card p-6 shadow-sm h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" strokeWidth={2} />
          AI coaching insights
        </h3>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh AI insights"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="divide-y divide-border">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="py-4 first:pt-0 animate-pulse">
              <div className="h-3 w-24 bg-muted mb-3 rounded" />
              <div className="h-3 w-full bg-muted mb-1.5 rounded" />
              <div className="h-3 w-3/4 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : !insights ? (
        <div className="text-center py-10">
          <Brain className="h-8 w-8 mx-auto mb-3 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm font-medium text-foreground">No insights yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
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
                <span className="font-medium text-foreground">{insights.coaching_opportunity.rep_name}</span>
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
              <div className="rounded-[10px] border border-border bg-background p-3 mt-1">
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "text-2xl font-semibold tabular-nums leading-none",
                      insights.quota_prediction.percentage >= 90
                        ? "text-success"
                        : insights.quota_prediction.percentage >= 70
                        ? "text-warning"
                        : "text-destructive"
                    )}
                  >
                    {insights.quota_prediction.percentage}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {insights.quota_prediction.confidence} confidence
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {insights.quota_prediction.factors}
                </p>
              </div>
            </InsightRow>
          )}
        </div>
      )}
    </div>
  );
}
