import { GitBranch, DollarSign, TrendingUp, Trophy, XCircle } from 'lucide-react';
import { ViperCard, ViperCardContent } from '@/components/ui/viper-card';
import { cn } from '@/lib/utils';

interface PipelineMetricsProps {
  totalDeals: number;
  totalValue: number;
  weightedValue: number;
  wonDeals: number;
  wonValue: number;
  lostDeals: number;
}

export function PipelineMetrics({
  totalDeals,
  totalValue,
  weightedValue,
  wonDeals,
  wonValue,
  lostDeals,
}: PipelineMetricsProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const metrics = [
    {
      label: 'Open Deals',
      value: totalDeals,
      icon: GitBranch,
      color: 'text-primary',
    },
    {
      label: 'Pipeline Value',
      value: formatCurrency(totalValue),
      icon: DollarSign,
      color: 'text-emerald-400',
    },
    {
      label: 'Weighted Value',
      value: formatCurrency(weightedValue),
      icon: TrendingUp,
      color: 'text-cyan-400',
    },
    {
      label: 'Won This Period',
      value: `${wonDeals} (${formatCurrency(wonValue)})`,
      icon: Trophy,
      color: 'text-amber-400',
    },
    {
      label: 'Lost',
      value: lostDeals,
      icon: XCircle,
      color: 'text-red-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {metrics.map((metric) => (
        <ViperCard key={metric.label} variant="glass" className="p-3">
          <ViperCardContent className="p-0">
            <div className="flex items-center gap-2">
              <metric.icon className={cn('h-4 w-4', metric.color)} />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{metric.label}</p>
                <p className="font-bold text-lg truncate">{metric.value}</p>
              </div>
            </div>
          </ViperCardContent>
        </ViperCard>
      ))}
    </div>
  );
}
