import { useState } from 'react';
import { Plus, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DealCard } from './DealCard';
import { STAGE_CONFIG, type Deal, type DealStage } from '@/hooks/useDealPipeline';
import { cn } from '@/lib/utils';

interface PipelineColumnProps {
  stage: DealStage;
  deals: Deal[];
  onDealClick: (deal: Deal) => void;
  onAddDeal?: (stage: DealStage) => void;
  onDragStart: (deal: Deal) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (stage: DealStage) => void;
  isDragOver: boolean;
}

export function PipelineColumn({
  stage,
  deals,
  onDealClick,
  onAddDeal,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: PipelineColumnProps) {
  const config = STAGE_CONFIG[stage];
  const totalValue = deals.reduce((sum, d) => sum + Number(d.deal_value), 0);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  const isClosedStage = stage === 'closed_won' || stage === 'closed_lost';

  return (
    <div
      className={cn(
        'flex flex-col bg-background/30 rounded-lg border border-border/50 min-w-[280px] max-w-[320px] transition-all duration-200',
        isDragOver && 'border-primary bg-primary/5 scale-[1.02]',
        isClosedStage && 'opacity-80'
      )}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e);
      }}
      onDrop={() => onDrop(stage)}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded-full', config.color)} />
            <span className="font-semibold text-sm">{config.label}</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {deals.length}
          </Badge>
        </div>
        
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <DollarSign className="h-3 w-3" />
          <span>{formatCurrency(totalValue)}</span>
        </div>
      </div>

      {/* Deals List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-2">
          {deals.map((deal) => (
            <div
              key={deal.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                onDragStart(deal);
              }}
            >
              <DealCard
                deal={deal}
                onClick={() => onDealClick(deal)}
              />
            </div>
          ))}
          
          {deals.length === 0 && (
            <div className="text-center font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground/60 py-10 px-4 border border-dashed border-border/50">
              {isClosedStage ? '— No deals —' : '— Drop here —'}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add Deal Button */}
      {!isClosedStage && onAddDeal && (
        <div className="p-2 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => onAddDeal(stage)}
          >
            <Plus className="h-4 w-4" />
            <span>Add Deal</span>
          </Button>
        </div>
      )}
    </div>
  );
}
