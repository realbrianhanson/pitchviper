import { useState, useMemo, useCallback } from "react";
import { Plus, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { ViperButton } from "@/components/ui/viper-button";
import { PipelineColumn } from "@/components/pipeline/PipelineColumn";
import { PipelineMetrics } from "@/components/pipeline/PipelineMetrics";
import { PipelineFilters } from "@/components/pipeline/PipelineFilters";
import { DealDetailPanel } from "@/components/pipeline/DealDetailPanel";
import { CreateDealModal } from "@/components/pipeline/CreateDealModal";
import { EditDealModal } from "@/components/pipeline/EditDealModal";
import { useDealPipeline, STAGES_ORDER, type Deal, type DealStage } from "@/hooks/useDealPipeline";
import { toast } from "sonner";

export default function DealPipeline() {
  const {
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

  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [createInitialStage, setCreateInitialStage] = useState<DealStage>("prospecting");
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [valueRange, setValueRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (dateRange.start || dateRange.end) count++;
    if (valueRange.min !== null || valueRange.max !== null) count++;
    return count;
  }, [dateRange, valueRange]);

  const filteredDealsByStage = useMemo(() => {
    const filtered: Record<DealStage, Deal[]> = {} as Record<DealStage, Deal[]>;
    STAGES_ORDER.forEach((stage) => {
      filtered[stage] = (dealsByStage[stage] || []).filter((deal) => {
        if (dateRange.start && deal.expected_close_date && deal.expected_close_date < dateRange.start) return false;
        if (dateRange.end && deal.expected_close_date && deal.expected_close_date > dateRange.end) return false;
        if (valueRange.min !== null && Number(deal.deal_value) < valueRange.min) return false;
        if (valueRange.max !== null && Number(deal.deal_value) > valueRange.max) return false;
        return true;
      });
    });
    return filtered;
  }, [dealsByStage, dateRange, valueRange]);

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

  const handleDragStart = useCallback((deal: Deal) => setDraggedDeal(deal), []);
  const handleDragOver = useCallback(() => {}, []);

  const handleDrop = useCallback(
    async (stage: DealStage) => {
      if (draggedDeal && draggedDeal.stage !== stage) {
        try {
          await moveDealToStage.mutateAsync({ dealId: draggedDeal.id, newStage: stage });
          toast.success(`Deal moved to ${stage.replace("_", " ")}`);
        } catch {}
      }
      setDraggedDeal(null);
      setDragOverStage(null);
    },
    [draggedDeal, moveDealToStage]
  );

  const handleClearFilters = useCallback(() => {
    setDateRange({ start: "", end: "" });
    setValueRange({ min: null, max: null });
  }, []);

  if (isLoading) {
    return (
      <AppLayout title="Deal Pipeline">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" strokeWidth={1.5} />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Loading Pipeline
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Deal Pipeline">
      <div className="max-w-[1600px] mx-auto w-full space-y-6 h-full flex flex-col">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 pb-2"
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 mb-3">
              Pipeline · {showTeamDeals ? "Team View" : "My Deals"}
            </p>
            <h1 className="font-display text-5xl md:text-6xl leading-[1.05]">
              The <span className="italic">Floor.</span>
            </h1>
          </div>
          <div className="flex items-end gap-4">
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
            <ViperButton onClick={() => handleAddDeal("prospecting")} size="sm">
              <Plus className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
              New Deal
            </ViperButton>
          </div>
        </motion.div>

        <PipelineMetrics {...pipelineMetrics} />

        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-px bg-border border border-border min-h-[500px]" style={{ minWidth: "max-content" }}>
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

      <CreateDealModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={async (data) => { await createDeal.mutateAsync(data); }}
        initialStage={createInitialStage}
      />
      <EditDealModal
        deal={selectedDeal}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSubmit={async (data) => { await updateDeal.mutateAsync(data); }}
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
