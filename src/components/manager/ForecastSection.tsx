import { DollarSign, TrendingUp, AlertTriangle, Target, RefreshCw, Loader2 } from 'lucide-react';
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from '@/components/ui/viper-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useForecast } from '@/hooks/useForecast';
import { cn } from '@/lib/utils';

interface ForecastSectionProps {
  teamQuota?: number;
}

export function ForecastSection({ teamQuota = 500000 }: ForecastSectionProps) {
  const { forecast, repForecast, insights, atRiskDeals, isLoading, refetch } = useForecast();

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <ViperCard>
        <ViperCardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating forecast...</p>
          </div>
        </ViperCardContent>
      </ViperCard>
    );
  }

  if (!forecast) {
    return (
      <ViperCard>
        <ViperCardContent className="py-8 text-center">
          <p className="text-muted-foreground">No forecast data available</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Generate Forecast
          </Button>
        </ViperCardContent>
      </ViperCard>
    );
  }

  const forecastProgress = (forecast.weightedForecast / teamQuota) * 100;
  const closedProgress = (forecast.revenueClosedThisMonth / teamQuota) * 100;

  return (
    <div className="space-y-6">
      {/* Forecast Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            This Month's Forecast
          </h2>
          <p className="text-sm text-muted-foreground">
            Team Quota: {formatCurrency(teamQuota)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Forecast Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ViperCard variant="glass">
          <ViperCardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Pipeline Value</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(forecast.totalPipelineValue)}</p>
            <p className="text-xs text-muted-foreground">{forecast.openDealsCount} deals</p>
          </ViperCardContent>
        </ViperCard>

        <ViperCard variant="glass" className="border-primary/30">
          <ViperCardContent className="p-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Weighted Forecast</span>
            </div>
            <p className="text-2xl font-bold text-primary">{formatCurrency(forecast.weightedForecast)}</p>
            <p className="text-xs text-muted-foreground">Expected revenue</p>
          </ViperCardContent>
        </ViperCard>

        <ViperCard variant="glass">
          <ViperCardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Best / Worst Case</div>
            <p className="text-lg font-bold">
              <span className="text-emerald-400">{formatCurrency(forecast.bestCase)}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-amber-400">{formatCurrency(forecast.worstCase)}</span>
            </p>
            <p className="text-xs text-muted-foreground">Range based on momentum</p>
          </ViperCardContent>
        </ViperCard>

        <ViperCard variant="glass" className={cn(
          forecast.atRiskCount > 0 ? "border-amber-500/30" : "border-emerald-500/30"
        )}>
          <ViperCardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-400 mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs">At Risk</span>
            </div>
            <p className="text-2xl font-bold">{forecast.atRiskCount}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(forecast.atRiskValue)} value</p>
          </ViperCardContent>
        </ViperCard>
      </div>

      {/* Progress to Quota */}
      <ViperCard variant="glass">
        <ViperCardHeader className="pb-2">
          <ViperCardTitle className="text-sm">Progress to Quota</ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Closed Revenue</span>
              <span className="font-medium text-emerald-400">
                {formatCurrency(forecast.revenueClosedThisMonth)} ({closedProgress.toFixed(0)}%)
              </span>
            </div>
            <Progress value={Math.min(closedProgress, 100)} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Forecast (including open)</span>
              <span className="font-medium text-primary">
                {formatCurrency(forecast.revenueClosedThisMonth + forecast.weightedForecast)} ({(closedProgress + forecastProgress).toFixed(0)}%)
              </span>
            </div>
            <Progress value={Math.min(closedProgress + forecastProgress, 100)} className="h-2 bg-primary/20" />
          </div>
        </ViperCardContent>
      </ViperCard>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forecast by Rep */}
        <ViperCard>
          <ViperCardHeader>
            <ViperCardTitle>Forecast by Rep</ViperCardTitle>
          </ViperCardHeader>
          <ViperCardContent>
            {repForecast.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
            ) : (
              <div className="space-y-3">
                {repForecast.map((rep, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{rep.name}</p>
                      <p className="text-xs text-muted-foreground">{rep.dealCount} deals</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(rep.weightedForecast)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(rep.pipelineValue)} pipeline
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {rep.avgProbability}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ViperCardContent>
        </ViperCard>

        {/* AI Insights */}
        <ViperCard className="border-primary/20">
          <ViperCardHeader>
            <ViperCardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              AI Forecast Insights
            </ViperCardTitle>
          </ViperCardHeader>
          <ViperCardContent>
            {insights.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No insights available</p>
            ) : (
              <div className="space-y-3">
                {insights.map((insight, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <span className="text-primary shrink-0">•</span>
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            )}
          </ViperCardContent>
        </ViperCard>
      </div>

      {/* At Risk Deals */}
      {atRiskDeals.length > 0 && (
        <ViperCard className="border-amber-500/20">
          <ViperCardHeader>
            <ViperCardTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Deals at Risk
            </ViperCardTitle>
          </ViperCardHeader>
          <ViperCardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {atRiskDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
                >
                  <p className="font-medium text-sm">{deal.company}</p>
                  <p className="text-lg font-bold">{formatCurrency(deal.value)}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground capitalize">
                      {deal.stage.replace('_', ' ')}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        deal.momentum < 30 ? "border-red-500 text-red-400" : "border-amber-500 text-amber-400"
                      )}
                    >
                      {deal.momentum}/100
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ViperCardContent>
        </ViperCard>
      )}
    </div>
  );
}
