import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ForecastData {
  totalPipelineValue: number;
  weightedForecast: number;
  bestCase: number;
  worstCase: number;
  openDealsCount: number;
  atRiskCount: number;
  atRiskValue: number;
  revenueClosedThisMonth: number;
  dealsClosedThisMonth: number;
}

export interface RepForecast {
  name: string;
  pipelineValue: number;
  weightedForecast: number;
  dealCount: number;
  avgProbability: number;
}

export interface AtRiskDeal {
  id: string;
  company: string;
  value: number;
  momentum: number;
  stage: string;
}

export function useForecast() {
  const { profile, isManager } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['forecast', profile?.team_id, isManager],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-forecast', {
        body: {
          team_id: isManager ? profile?.team_id : null,
          user_id: !isManager ? profile?.user_id : null,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return {
        forecast: data.forecast as ForecastData,
        repForecast: data.repForecast as RepForecast[],
        insights: data.insights as string[],
        atRiskDeals: data.atRiskDeals as AtRiskDeal[],
      };
    },
    enabled: !!profile,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    forecast: data?.forecast,
    repForecast: data?.repForecast || [],
    insights: data?.insights || [],
    atRiskDeals: data?.atRiskDeals || [],
    isLoading,
    error,
    refetch,
  };
}
