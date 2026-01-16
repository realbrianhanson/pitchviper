import { useEffect } from 'react';
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Shield,
  ArrowRight,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from '@/components/ui/viper-card';
import { useDealCoaching, type DealCoaching } from '@/hooks/useDealCoaching';
import { cn } from '@/lib/utils';

interface DealCoachPanelProps {
  dealId: string;
  onAnalyze?: () => void;
}

export function DealCoachPanel({ dealId, onAnalyze }: DealCoachPanelProps) {
  const { coaching, isLoading, error, analyzeDeal } = useDealCoaching();

  useEffect(() => {
    if (dealId) {
      analyzeDeal(dealId);
    }
  }, [dealId]);

  const handleRefresh = () => {
    analyzeDeal(dealId);
    onAnalyze?.();
  };

  if (isLoading) {
    return (
      <ViperCard variant="glass" className="border-primary/30">
        <ViperCardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">AI Coach analyzing deal...</p>
          </div>
        </ViperCardContent>
      </ViperCard>
    );
  }

  if (error) {
    return (
      <ViperCard variant="glass" className="border-destructive/30">
        <ViperCardContent className="py-6">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </ViperCardContent>
      </ViperCard>
    );
  }

  if (!coaching) {
    return (
      <ViperCard variant="glass">
        <ViperCardContent className="py-6">
          <div className="flex flex-col items-center justify-center gap-3">
            <Brain className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Click to get AI coaching</p>
            <Button onClick={handleRefresh}>
              <Brain className="h-4 w-4 mr-2" />
              Analyze Deal
            </Button>
          </div>
        </ViperCardContent>
      </ViperCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <span className="font-semibold">AI Deal Coach</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Health Summary */}
      <ViperCard variant="glass" className="border-primary/20">
        <ViperCardContent className="py-3">
          <p className="text-sm leading-relaxed">{coaching.healthSummary}</p>
        </ViperCardContent>
      </ViperCard>

      {/* Next Best Step - Highlighted */}
      <ViperCard className="bg-primary/10 border-primary/30">
        <ViperCardContent className="py-3">
          <div className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-primary font-medium uppercase tracking-wider mb-1">Next Best Step</p>
              <p className="text-sm font-medium">{coaching.nextBestStep}</p>
            </div>
          </div>
        </ViperCardContent>
      </ViperCard>

      {/* Risk Factors */}
      {coaching.riskFactors.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span>Risk Factors</span>
          </div>
          <div className="space-y-1">
            {coaching.riskFactors.map((risk, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-amber-400">•</span>
                <span>{risk}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Actions */}
      {coaching.recommendedActions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
            <CheckCircle className="h-4 w-4" />
            <span>Recommended Actions</span>
          </div>
          <div className="space-y-1">
            {coaching.recommendedActions.map((action, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-emerald-400">{i + 1}.</span>
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Questions */}
      {coaching.suggestedQuestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-cyan-400">
            <HelpCircle className="h-4 w-4" />
            <span>Suggested Questions</span>
          </div>
          <div className="space-y-1">
            {coaching.suggestedQuestions.map((q, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground italic">
                <span className="text-cyan-400 not-italic">"</span>
                <span>{q}"</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Objections to Expect */}
      {coaching.objectionsToExpect.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-purple-400">
            <Shield className="h-4 w-4" />
            <span>Prepare for These Objections</span>
          </div>
          <div className="space-y-1">
            {coaching.objectionsToExpect.map((obj, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-purple-400">•</span>
                <span>{obj}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
