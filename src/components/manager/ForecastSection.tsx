import { DollarSign, TrendingUp, AlertTriangle, Target, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useForecast } from '@/hooks/useForecast';
import { cn } from '@/lib/utils';

interface ForecastSectionProps {
  teamQuota?: number;
}

function cleanName(name: string): string {
  return name.replace(/https?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim();
}

const cardCls = "rounded-[12px] border border-border bg-card shadow-sm";

export function ForecastSection({ teamQuota = 500000 }: ForecastSectionProps) {
  const { forecast, repForecast, insights, atRiskDeals, isLoading, refetch } = useForecast();

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <div className={cn(cardCls, "py-12")}>
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Generating forecast...</p>
        </div>
      </div>
    );
  }

  if (!forecast) {
    return (
      <div className={cn(cardCls, "py-8 text-center")}>
        <p className="text-sm text-muted-foreground">No forecast data available</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Generate forecast
        </Button>
      </div>
    );
  }

  const forecastProgress = (forecast.weightedForecast / teamQuota) * 100;
  const closedProgress = (forecast.revenueClosedThisMonth / teamQuota) * 100;

  const summary = [
    {
      icon: DollarSign,
      label: "Pipeline value",
      value: formatCurrency(forecast.totalPipelineValue),
      caption: `${forecast.openDealsCount} deals`,
    },
    {
      icon: TrendingUp,
      label: "Weighted forecast",
      value: formatCurrency(forecast.weightedForecast),
      caption: "Expected revenue",
      accent: "primary" as const,
    },
    {
      icon: Target,
      label: "Best / worst case",
      value: (
        <span>
          <span className="text-success">{formatCurrency(forecast.bestCase)}</span>
          <span className="text-muted-foreground mx-1">/</span>
          <span className="text-warning">{formatCurrency(forecast.worstCase)}</span>
        </span>
      ),
      caption: "Momentum-adjusted range",
    },
    {
      icon: AlertTriangle,
      label: "At risk",
      value: String(forecast.atRiskCount),
      caption: `${formatCurrency(forecast.atRiskValue)} value`,
      accent: "warning" as const,
    },
  ];

  return (
    <div className={cn(cardCls, "p-6 space-y-6")}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" strokeWidth={2} />
            This month's forecast
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Team quota: {formatCurrency(teamQuota)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-[10px] border border-border bg-background p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md",
                  s.accent === "primary" ? "bg-primary/10 text-primary"
                    : s.accent === "warning" ? "bg-warning/10 text-warning"
                    : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className={cn(
                "text-xl font-semibold tabular-nums leading-none",
                s.accent === "primary" && "text-primary"
              )}>
                {s.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">{s.caption}</p>
            </div>
          );
        })}
      </div>

      {/* Progress to quota */}
      <div className="rounded-[10px] border border-border bg-background p-5 space-y-4">
        <h4 className="text-sm font-semibold text-foreground">Progress to quota</h4>
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-muted-foreground">Closed revenue</span>
            <span className="font-medium text-success tabular-nums">
              {formatCurrency(forecast.revenueClosedThisMonth)} · {closedProgress.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-success"
              style={{ width: `${Math.min(closedProgress, 100)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-muted-foreground">Forecast (incl. open)</span>
            <span className="font-medium text-primary tabular-nums">
              {formatCurrency(forecast.revenueClosedThisMonth + forecast.weightedForecast)} · {(closedProgress + forecastProgress).toFixed(0)}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(closedProgress + forecastProgress, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Two column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Rep forecast */}
        <div className="rounded-[10px] border border-border bg-background p-5">
          <h4 className="text-sm font-semibold text-foreground mb-3">Forecast by rep</h4>
          {repForecast.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No data</p>
          ) : (
            <div className="divide-y divide-border">
              {repForecast.map((rep, i) => (
                <div key={i} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{cleanName(rep.name)}</p>
                    <p className="text-xs text-muted-foreground">{rep.dealCount} deals</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(rep.weightedForecast)}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(rep.pipelineValue)} pipeline</p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {rep.avgProbability}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Insights */}
        <div className="rounded-[10px] border border-border bg-background p-5">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" strokeWidth={2} />
            Forecast insights
          </h4>
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No insights available</p>
          ) : (
            <ul className="space-y-2.5">
              {insights.map((insight, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground/90">
                  <span className="text-primary shrink-0 mt-1.5 h-1 w-1 rounded-full bg-primary" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* At-risk deals */}
      {atRiskDeals.length > 0 && (
        <div className="rounded-[10px] border border-warning/30 bg-warning/5 p-5">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-warning" strokeWidth={2} />
            Deals at risk
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {atRiskDeals.map((deal) => (
              <div key={deal.id} className="rounded-[10px] border border-border bg-card p-3">
                <p className="text-sm font-medium text-foreground truncate">{deal.company}</p>
                <p className="text-lg font-semibold tabular-nums text-foreground mt-1">{formatCurrency(deal.value)}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground capitalize">
                    {deal.stage.replace('_', ' ')}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      deal.momentum < 30 ? "border-destructive/40 text-destructive" : "border-warning/40 text-warning"
                    )}
                  >
                    {deal.momentum}/100
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
