import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DealCoaching {
  healthSummary: string;
  riskFactors: string[];
  recommendedActions: string[];
  suggestedQuestions: string[];
  objectionsToExpect: string[];
  nextBestStep: string;
}

export function useDealCoaching() {
  const [isLoading, setIsLoading] = useState(false);
  const [coaching, setCoaching] = useState<DealCoaching | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeDeal = async (dealId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-deal', {
        body: { deal_id: dealId },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setCoaching(data.coaching);
      return data.coaching;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to analyze deal';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshMomentum = async (dealId?: string) => {
    try {
      await supabase.functions.invoke('calculate-deal-momentum', {
        body: { deal_id: dealId },
      });
    } catch (err) {
      console.error('Error refreshing momentum:', err);
    }
  };

  return {
    coaching,
    isLoading,
    error,
    analyzeDeal,
    refreshMomentum,
  };
}
