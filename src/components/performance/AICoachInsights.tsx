import { Sparkles, Trophy, TrendingUp, Lightbulb, CheckCircle, RefreshCw, Loader2 } from "lucide-react";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { Button } from "@/components/ui/button";
import { PerformanceInsights } from "@/hooks/usePerformanceData";

interface AICoachInsightsProps {
  insights: PerformanceInsights | null;
  loading: boolean;
  onRefresh: () => void;
}

export function AICoachInsights({ insights, loading, onRefresh }: AICoachInsightsProps) {
  if (!insights && !loading) {
    return (
      <ViperCard variant="glass" className="gradient-border">
        <ViperCardHeader>
          <ViperCardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Your Personal Coach
          </ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground text-center mb-4">
              Get AI-powered insights based on your performance data
            </p>
            <Button onClick={onRefresh} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Insights
            </Button>
          </div>
        </ViperCardContent>
      </ViperCard>
    );
  }

  if (loading) {
    return (
      <ViperCard variant="glass" className="gradient-border">
        <ViperCardHeader>
          <ViperCardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Your Personal Coach
          </ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Analyzing your performance...</p>
          </div>
        </ViperCardContent>
      </ViperCard>
    );
  }

  return (
    <ViperCard variant="glass" className="gradient-border">
      <ViperCardHeader className="flex flex-row items-center justify-between">
        <ViperCardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Your Personal Coach
        </ViperCardTitle>
        <Button variant="ghost" size="sm" onClick={onRefresh} className="gap-1">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </ViperCardHeader>
      <ViperCardContent className="space-y-6">
        {/* Big Win */}
        <div className="p-4 rounded-lg bg-success/10 border border-success/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-success/20">
              <Trophy className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm font-medium text-success mb-1">🎉 Big Win</p>
              <p className="font-semibold text-foreground">{insights?.bigWin.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{insights?.bigWin.description}</p>
            </div>
          </div>
        </div>

        {/* Growth Area */}
        <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-warning/20">
              <TrendingUp className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm font-medium text-warning mb-1">📈 Growth Area</p>
              <p className="font-semibold text-foreground">{insights?.growthArea.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{insights?.growthArea.description}</p>
            </div>
          </div>
        </div>

        {/* Pattern Detected */}
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary mb-1">💡 Pattern Detected</p>
              <p className="font-semibold text-foreground">{insights?.patternDetected.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{insights?.patternDetected.description}</p>
            </div>
          </div>
        </div>

        {/* Recommended Actions */}
        <div className="p-4 rounded-lg bg-card border border-border">
          <p className="text-sm font-medium text-foreground mb-3">✅ This Week's Action Items</p>
          <div className="space-y-2">
            {insights?.recommendedActions.map((action, index) => (
              <div key={index} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">{action}</p>
              </div>
            ))}
          </div>
        </div>
      </ViperCardContent>
    </ViperCard>
  );
}
