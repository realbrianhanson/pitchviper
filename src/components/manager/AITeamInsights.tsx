import { Brain, TrendingUp, Target, Users, RefreshCw, AlertCircle } from "lucide-react";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { ManagerInsights } from "@/hooks/useManagerDashboard";
import { cn } from "@/lib/utils";

interface AITeamInsightsProps {
  insights: ManagerInsights | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function AITeamInsights({ insights, isLoading, onRefresh }: AITeamInsightsProps) {
  if (isLoading) {
    return (
      <ViperCard>
        <ViperCardHeader>
          <ViperCardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Team Insights
          </ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </ViperCardContent>
      </ViperCard>
    );
  }

  return (
    <ViperCard>
      <ViperCardHeader className="flex-row items-center justify-between">
        <ViperCardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Team Insights
        </ViperCardTitle>
        <ViperButton size="sm" variant="ghost" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
        </ViperButton>
      </ViperCardHeader>
      <ViperCardContent className="space-y-4">
        {/* Team Trend */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">This Week's Trend</span>
          </div>
          <p className="text-sm text-foreground">
            {insights?.team_trend || 'No trend data available yet.'}
          </p>
        </div>

        {/* Coaching Opportunity */}
        {insights?.coaching_opportunity && (
          <div className="p-4 rounded-lg bg-warning/5 border border-warning/10">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-warning" />
              <span className="text-sm font-semibold text-warning">Top Coaching Opportunity</span>
            </div>
            <p className="text-sm text-foreground mb-2">
              <span className="font-semibold">{insights.coaching_opportunity.rep_name}</span>
              {' — '}{insights.coaching_opportunity.reason}
            </p>
            <p className="text-xs text-muted-foreground">
              Focus on: {insights.coaching_opportunity.suggested_focus}
            </p>
          </div>
        )}

        {/* Skill Gap */}
        {insights?.skill_gap && (
          <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/10">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-semibold text-destructive">Skill Gap Detected</span>
            </div>
            <p className="text-sm text-foreground mb-2">
              {insights.skill_gap.gap}
            </p>
            <p className="text-xs text-muted-foreground">
              Affects {insights.skill_gap.affected_count} reps • {insights.skill_gap.recommendation}
            </p>
          </div>
        )}

        {/* Quota Prediction */}
        {insights?.quota_prediction && (
          <div className="p-4 rounded-lg bg-success/5 border border-success/10">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-success" />
              <span className="text-sm font-semibold text-success">Quota Attainment Prediction</span>
            </div>
            <div className="flex items-center gap-4 mb-2">
              <span className={cn(
                "text-3xl font-display font-bold",
                insights.quota_prediction.percentage >= 90 ? "text-success" :
                insights.quota_prediction.percentage >= 70 ? "text-warning" : "text-destructive"
              )}>
                {insights.quota_prediction.percentage}%
              </span>
              <span className={cn(
                "text-xs px-2 py-1 rounded-full",
                insights.quota_prediction.confidence === 'high' ? "bg-success/20 text-success" :
                insights.quota_prediction.confidence === 'medium' ? "bg-warning/20 text-warning" :
                "bg-muted text-muted-foreground"
              )}>
                {insights.quota_prediction.confidence} confidence
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {insights.quota_prediction.factors}
            </p>
          </div>
        )}

        {!insights && (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No insights available yet.</p>
            <p className="text-sm">Check back after your team has some activity.</p>
          </div>
        )}
      </ViperCardContent>
    </ViperCard>
  );
}