import { useMemo } from 'react';
import { format, differenceInDays } from 'date-fns';
import { Building2, User, DollarSign, Calendar, TrendingUp, TrendingDown, Minus, GripVertical, Phone } from 'lucide-react';
import { ViperCard } from '@/components/ui/viper-card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Deal } from '@/hooks/useDealPipeline';
import { cn } from '@/lib/utils';
import { useClickToDial } from '@/hooks/useClickToDial';

interface DealCardProps {
  deal: Deal;
  onClick: () => void;
  isDragging?: boolean;
}

export function DealCard({ deal, onClick, isDragging }: DealCardProps) {
  const { openDialModal } = useClickToDial();

  const daysInStage = useMemo(() => {
    return differenceInDays(new Date(), new Date(deal.updated_at));
  }, [deal.updated_at]);

  const momentumIndicator = useMemo(() => {
    if (deal.momentum_score >= 70) {
      return { color: 'bg-emerald-500', icon: TrendingUp, label: 'High momentum' };
    } else if (deal.momentum_score >= 40) {
      return { color: 'bg-amber-500', icon: Minus, label: 'Medium momentum' };
    } else {
      return { color: 'bg-red-500', icon: TrendingDown, label: 'Low momentum' };
    }
  }, [deal.momentum_score]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleClickToDial = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deal.contact_phone) {
      openDialModal({
        phoneNumber: deal.contact_phone,
        contactName: deal.contact_name,
        companyName: deal.company_name,
        dealId: deal.id,
      });
    }
  };

  return (
    <ViperCard
      variant="glass"
      className={cn(
        'cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:border-primary/50',
        isDragging && 'opacity-50 scale-105 rotate-2'
      )}
      onClick={onClick}
    >
      <div className="p-3 space-y-3">
        {/* Header with grip and company */}
        <div className="flex items-start gap-2">
          <div className="text-muted-foreground/50 cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="font-semibold text-sm truncate">{deal.company_name}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <User className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{deal.contact_name}</span>
              {deal.contact_phone && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-primary hover:bg-primary/10"
                      onClick={handleClickToDial}
                    >
                      <Phone className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Call {deal.contact_name}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          
          {/* Momentum indicator */}
          <div className="flex items-center gap-1" title={momentumIndicator.label}>
            <div className={cn('w-2 h-2 rounded-full', momentumIndicator.color)} />
          </div>
        </div>

        {/* Deal value */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            <span className="font-bold text-lg">{formatCurrency(Number(deal.deal_value))}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {deal.probability}%
          </Badge>
        </div>

        {/* Footer with date and days in stage */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
          {deal.expected_close_date ? (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(deal.expected_close_date), 'MMM d')}</span>
            </div>
          ) : (
            <span className="text-muted-foreground/50">No close date</span>
          )}
          
          <div className="flex items-center gap-2">
            <span className={cn(
              daysInStage > 14 ? 'text-red-400' : daysInStage > 7 ? 'text-amber-400' : 'text-muted-foreground'
            )}>
              {daysInStage}d in stage
            </span>
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                {deal.contact_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </ViperCard>
  );
}
