import { useState, useMemo, useCallback } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { PipelineColumn } from '@/components/pipeline/PipelineColumn';
import { PipelineMetrics } from '@/components/pipeline/PipelineMetrics';
import { PipelineFilters } from '@/components/pipeline/PipelineFilters';
import { DealCard } from '@/components/pipeline/DealCard';
import { DealDetailPanel } from '@/components/pipeline/DealDetailPanel';
import { CreateDealModal } from '@/components/pipeline/CreateDealModal';
import { EditDealModal } from '@/components/pipeline/EditDealModal';
import { useDealPipeline, STAGES_ORDER, type Deal, type DealStage } from '@/hooks/useDealPipeline';
import { toast } from 'sonner';

export default function DealPipeline() {
  const {
    deals,
    dealsByStage,
    isLoading,
    createDeal,
    updateDeal,
    moveDealToStage,
    deleteDeal,
    fetchDealHistory,
    pipelineMetrics,
    showTeamDeals,
    setShowTeamDeals,
  } = useDealPipeline();

  // Modal states
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [createInitialStage, setCreateInitialStage] = useState<DealStage>('prospecting');

  // Drag state
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);

  // Filter states
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [valueRange, setValueRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });

  // Calculate active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (dateRange.start || dateRange.end) count++;
    if (valueRange.min !== null || valueRange.max !== null) count++;
    return count;
  }, [dateRange, valueRange]);

  // Filter deals
  const filteredDealsByStage = useMemo(() => {
    const filtered: Record<DealStage, Deal[]> = {} as Record<DealStage, Deal[]>;
    
    STAGES_ORDER.forEach((stage) => {
      filtered[stage] = (dealsByStage[stage] || []).filter((deal) => {
        // Date filter
        if (dateRange.start && deal.expected_close_date && deal.expected_close_date < dateRange.start) {
          return false;
        }
        if (dateRange.end && deal.expected_close_date && deal.expected_close_date > dateRange.end) {
          return false;
        }
        
        // Value filter
        if (valueRange.min !== null && Number(deal.deal_value) < valueRange.min) {
          return false;
        }
        if (valueRange.max !== null && Number(deal.deal_value) > valueRange.max) {
          return false;
        }
        
        return true;
      });
    });
    
    return filtered;
  }, [dealsByStage, dateRange, valueRange]);

  // Handlers
  const handleDealClick = useCallback((deal: Deal) => {
    setSelectedDeal(deal);
    setIsDetailOpen(true);
  }, []);

  const handleAddDeal = useCallback((stage: DealStage) => {
    setCreateInitialStage(stage);
    setIsCreateOpen(true);
  }, []);

  const handleEditDeal = useCallback((deal: Deal) => {
    setSelectedDeal(deal);
    setIsDetailOpen(false);
    setIsEditOpen(true);
  }, []);

  const handleDragStart = useCallback((deal: Deal) => {
    setDraggedDeal(deal);
  }, []);

  const handleDragOver = useCallback(() => {
    // Handled by the column component
  }, []);

  const handleDrop = useCallback(async (stage: DealStage) => {
    if (draggedDeal && draggedDeal.stage !== stage) {
      try {
        await moveDealToStage.mutateAsync({ dealId: draggedDeal.id, newStage: stage });
        toast.success(`Deal moved to ${stage.replace('_', ' ')}`);
      } catch (error) {
        // Error handled by mutation
      }
    }
    setDraggedDeal(null);
    setDragOverStage(null);
  }, [draggedDeal, moveDealToStage]);

  const handleClearFilters = useCallback(() => {
    setDateRange({ start: '', end: '' });
    setValueRange({ min: null, max: null });
  }, []);

  if (isLoading) {
    return (
      <AppLayout title="Deal Pipeline">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Deal Pipeline">
      <div className="space-y-4 animate-fade-in h-full flex flex-col">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <PipelineFilters
            showTeamDeals={showTeamDeals}
            setShowTeamDeals={setShowTeamDeals}
            dateRange={dateRange}
            setDateRange={setDateRange}
            valueRange={valueRange}
            setValueRange={setValueRange}
            activeFiltersCount={activeFiltersCount}
            onClearFilters={handleClearFilters}
          />
          <Button onClick={() => handleAddDeal('prospecting')} className="gap-2">
            <Plus className="h-4 w-4" />
            New Deal
          </Button>
        </div>

        {/* Metrics */}
        <PipelineMetrics {...pipelineMetrics} />

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-3 min-h-[500px]" style={{ minWidth: 'max-content' }}>
            {STAGES_ORDER.map((stage) => (
              <PipelineColumn
                key={stage}
                stage={stage}
                deals={filteredDealsByStage[stage] || []}
                onDealClick={handleDealClick}
                onAddDeal={handleAddDeal}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isDragOver={dragOverStage === stage}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateDealModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={async (data) => {
          await createDeal.mutateAsync(data);
        }}
        initialStage={createInitialStage}
      />

      <EditDealModal
        deal={selectedDeal}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSubmit={async (data) => {
          await updateDeal.mutateAsync(data);
        }}
      />

      <DealDetailPanel
        deal={selectedDeal}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={handleEditDeal}
        onDelete={(dealId) => deleteDeal.mutate(dealId)}
        fetchHistory={fetchDealHistory}
      />
    </AppLayout>
  );
}
