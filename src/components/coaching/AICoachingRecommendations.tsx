import { CoachingInsights } from "@/hooks/useCoaching";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { ViperBadge } from "@/components/ui/viper-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Target, 
  MessageSquare, 
  Award, 
  Gamepad2, 
  Brain,
  RefreshCw,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { ViperButton } from "@/components/ui/viper-button";
import { cn } from "@/lib/utils";

interface AICoachingRecommendationsProps {
  insights: CoachingInsights | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function AICoachingRecommendations({ 
  insights, 
  isLoading,
  onRefresh 
}: AICoachingRecommendationsProps) {
  const getTrendIcon = (trend: string | undefined) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <ViperCard variant="glass">
        <ViperCardHeader>
          <ViperCardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary animate-pulse" />
            AI Coaching Recommendations
          </ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </ViperCardContent>
      </ViperCard>
    );
  }

  if (!insights) {
    return (
      <ViperCard variant="glass">
        <ViperCardHeader>
          <ViperCardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Coaching Recommendations
          </ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select a rep to see AI coaching recommendations</p>
          </div>
        </ViperCardContent>
      </ViperCard>
    );
  }

  return (
    <ViperCard variant="glass">
      <ViperCardHeader>
        <div className="flex items-center justify-between">
          <ViperCardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Coaching Recommendations
          </ViperCardTitle>
          <ViperButton variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </ViperButton>
        </div>
      </ViperCardHeader>
      <ViperCardContent className="space-y-6">
        {/* Performance Insights Summary */}
        {insights.performance_insights && (
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-2 mb-2">
              {getTrendIcon(insights.performance_insights.trend)}
              <span className={cn(
                "font-medium",
                insights.performance_insights.trend === 'improving' && "text-success",
                insights.performance_insights.trend === 'declining' && "text-destructive"
              )}>
                {insights.performance_insights.trend === 'improving' ? 'Performance Improving' :
                 insights.performance_insights.trend === 'declining' ? 'Needs Attention' : 
                 'Steady Performance'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Strength: </span>
                <span className="text-success">{insights.performance_insights.key_strength}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Opportunity: </span>
                <span className="text-warning">{insights.performance_insights.biggest_opportunity}</span>
              </div>
            </div>
          </div>
        )}

        {/* Focus Areas */}
        <div>
          <h4 className="flex items-center gap-2 font-semibold mb-3">
            <Target className="h-4 w-4 text-primary" />
            Focus Areas
          </h4>
          <div className="space-y-3">
            {insights.focus_areas.map((area, i) => (
              <div 
                key={i} 
                className="p-3 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20"
              >
                <p className="font-medium text-foreground">{area.area}</p>
                <p className="text-sm text-muted-foreground mt-1">{area.reason}</p>
                <div className="flex items-start gap-2 mt-2 text-sm">
                  <Lightbulb className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <span className="text-warning">{area.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conversation Starters */}
        {insights.conversation_starters.length > 0 && (
          <div>
            <h4 className="flex items-center gap-2 font-semibold mb-3">
              <MessageSquare className="h-4 w-4 text-primary" />
              Conversation Starters
            </h4>
            <div className="space-y-2">
              {insights.conversation_starters.map((question, i) => (
                <div 
                  key={i}
                  className="p-3 rounded-lg bg-muted/30 border border-border text-sm"
                >
                  "{question}"
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recognition Points */}
        {insights.recognition_points.length > 0 && (
          <div>
            <h4 className="flex items-center gap-2 font-semibold mb-3">
              <Award className="h-4 w-4 text-success" />
              Recognition Points
            </h4>
            <div className="space-y-2">
              {insights.recognition_points.map((point, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-2 p-2 rounded-lg bg-success/10 border border-success/20 text-sm"
                >
                  <span className="text-success">✓</span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Roleplay */}
        {insights.suggested_roleplay && (
          <div>
            <h4 className="flex items-center gap-2 font-semibold mb-3">
              <Gamepad2 className="h-4 w-4 text-primary" />
              Suggested Roleplay
            </h4>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <ViperBadge variant="secondary" size="sm">
                  {insights.suggested_roleplay.scenario_type}
                </ViperBadge>
              </div>
              <p className="text-sm text-muted-foreground">
                {insights.suggested_roleplay.reason}
              </p>
            </div>
          </div>
        )}

        {/* Patterns Detected */}
        {insights.patterns_detected.length > 0 && (
          <div>
            <h4 className="flex items-center gap-2 font-semibold mb-3">
              <Brain className="h-4 w-4 text-warning" />
              Patterns Detected
            </h4>
            <div className="space-y-2">
              {insights.patterns_detected.map((pattern, i) => (
                <div 
                  key={i}
                  className="flex items-start gap-2 p-2 rounded-lg bg-warning/10 border border-warning/20 text-sm"
                >
                  <span className="text-warning shrink-0">⚡</span>
                  <span>{pattern}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ViperCardContent>
    </ViperCard>
  );
}
