import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type DealStage = 
  | 'prospecting'
  | 'qualified'
  | 'demo_scheduled'
  | 'proposal_sent'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost';

export type DealType = 'new_business' | 'upsell' | 'renewal';

export interface Deal {
  id: string;
  user_id: string;
  team_id: string | null;
  company_name: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  deal_value: number;
  stage: DealStage;
  expected_close_date: string | null;
  probability: number;
  deal_type: DealType;
  source: string | null;
  notes: string | null;
  momentum_score: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  close_reason: string | null;
}

export interface DealStageHistoryEntry {
  id: string;
  deal_id: string;
  from_stage: string | null;
  to_stage: string;
  changed_by: string;
  changed_at: string;
}

export interface CreateDealInput {
  company_name: string;
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  deal_value: number;
  stage?: DealStage;
  expected_close_date?: string;
  probability?: number;
  deal_type?: DealType;
  source?: string;
  notes?: string;
}

export interface UpdateDealInput extends Partial<CreateDealInput> {
  id: string;
  close_reason?: string;
}

export const STAGE_CONFIG: Record<DealStage, { label: string; color: string; probability: number }> = {
  prospecting: { label: 'Prospecting', color: 'bg-slate-500', probability: 10 },
  qualified: { label: 'Qualified', color: 'bg-blue-500', probability: 25 },
  demo_scheduled: { label: 'Demo Scheduled', color: 'bg-cyan-500', probability: 40 },
  proposal_sent: { label: 'Proposal Sent', color: 'bg-purple-500', probability: 60 },
  negotiation: { label: 'Negotiation', color: 'bg-amber-500', probability: 80 },
  closed_won: { label: 'Closed Won', color: 'bg-emerald-500', probability: 100 },
  closed_lost: { label: 'Closed Lost', color: 'bg-red-500', probability: 0 },
};

export const STAGES_ORDER: DealStage[] = [
  'prospecting',
  'qualified',
  'demo_scheduled',
  'proposal_sent',
  'negotiation',
  'closed_won',
  'closed_lost',
];

export function useDealPipeline() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [showTeamDeals, setShowTeamDeals] = useState(false);

  // Fetch deals
  const { data: deals = [], isLoading, error } = useQuery({
    queryKey: ['deals', user?.id, showTeamDeals],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('deals')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!showTeamDeals) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Deal[];
    },
    enabled: !!user?.id,
  });

  // Create deal
  const createDeal = useMutation({
    mutationFn: async (input: CreateDealInput) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('deals')
        .insert({
          user_id: user.id,
          team_id: profile?.team_id,
          company_name: input.company_name,
          contact_name: input.contact_name,
          contact_email: input.contact_email,
          contact_phone: input.contact_phone,
          deal_value: input.deal_value,
          stage: input.stage || 'prospecting',
          expected_close_date: input.expected_close_date,
          probability: input.probability || STAGE_CONFIG[input.stage || 'prospecting'].probability,
          deal_type: input.deal_type || 'new_business',
          source: input.source,
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Log initial stage
      await supabase.from('deal_stage_history').insert({
        deal_id: data.id,
        from_stage: null,
        to_stage: input.stage || 'prospecting',
        changed_by: user.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Deal created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create deal: ' + error.message);
    },
  });

  // Update deal
  const updateDeal = useMutation({
    mutationFn: async (input: UpdateDealInput) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { id, ...updates } = input;

      // Get current deal to check stage change
      const { data: currentDeal } = await supabase
        .from('deals')
        .select('stage')
        .eq('id', id)
        .maybeSingle();

      const updateData: Record<string, unknown> = { ...updates };

      // If stage changed to closed, set closed_at
      if (updates.stage === 'closed_won' || updates.stage === 'closed_lost') {
        updateData.closed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log stage change if applicable
      if (updates.stage && currentDeal && currentDeal.stage !== updates.stage) {
        await supabase.from('deal_stage_history').insert({
          deal_id: id,
          from_stage: currentDeal.stage,
          to_stage: updates.stage,
          changed_by: user.id,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
    onError: (error) => {
      toast.error('Failed to update deal: ' + error.message);
    },
  });

  // Move deal to stage
  const moveDealToStage = useMutation({
    mutationFn: async ({ dealId, newStage }: { dealId: string; newStage: DealStage }) => {
      return updateDeal.mutateAsync({
        id: dealId,
        stage: newStage,
        probability: STAGE_CONFIG[newStage].probability,
      });
    },
  });

  // Delete deal
  const deleteDeal = useMutation({
    mutationFn: async (dealId: string) => {
      const { error } = await supabase.from('deals').delete().eq('id', dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Deal deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete deal: ' + error.message);
    },
  });

  // Fetch deal history
  const fetchDealHistory = async (dealId: string): Promise<DealStageHistoryEntry[]> => {
    const { data, error } = await supabase
      .from('deal_stage_history')
      .select('*')
      .eq('deal_id', dealId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return data;
  };

  // Group deals by stage
  const dealsByStage = STAGES_ORDER.reduce((acc, stage) => {
    acc[stage] = deals.filter((deal) => deal.stage === stage);
    return acc;
  }, {} as Record<DealStage, Deal[]>);

  // Pipeline metrics
  const pipelineMetrics = {
    totalDeals: deals.filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost').length,
    totalValue: deals
      .filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost')
      .reduce((sum, d) => sum + Number(d.deal_value), 0),
    weightedValue: deals
      .filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost')
      .reduce((sum, d) => sum + Number(d.deal_value) * (d.probability / 100), 0),
    wonDeals: deals.filter(d => d.stage === 'closed_won').length,
    wonValue: deals
      .filter(d => d.stage === 'closed_won')
      .reduce((sum, d) => sum + Number(d.deal_value), 0),
    lostDeals: deals.filter(d => d.stage === 'closed_lost').length,
  };

  // Set up realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('deals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deals',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['deals'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    deals,
    dealsByStage,
    isLoading,
    error,
    createDeal,
    updateDeal,
    moveDealToStage,
    deleteDeal,
    fetchDealHistory,
    pipelineMetrics,
    showTeamDeals,
    setShowTeamDeals,
  };
}
