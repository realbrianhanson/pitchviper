import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type DeepDiveType = 'industry_trends' | 'competitive_landscape' | 'recent_news' | 'decision_maker_intel';

export interface DeepDiveResult {
  content: string;
  citations: string[];
  query_type: DeepDiveType;
}

export interface Battlecard {
  competitor_name: string;
  overview: string;
  strengths: Array<{ strength: string; how_to_acknowledge: string }>;
  weaknesses: Array<{ weakness: string; evidence: string }>;
  differentiators: Array<{ area: string; our_advantage: string }>;
  switching_talk_track: string;
  trap_questions: Array<{ question: string; why_it_works: string }>;
  objection_responses: Array<{ objection: string; response: string }>;
  citations: string[];
  generated_at: string;
}

export function usePerplexityResearch() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [deepDiveResult, setDeepDiveResult] = useState<DeepDiveResult | null>(null);

  // Check cache
  const checkCache = useCallback(async (queryType: string, queryKey: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('perplexity_cache' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('query_type', queryType)
        .eq('query_key', queryKey)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1) as any;

      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Cache check error:', error);
      return null;
    }
  }, [user]);

  // Save to cache
  const saveToCache = useCallback(async (
    queryType: string,
    queryKey: string,
    researchData: any,
    citations: string[]
  ) => {
    if (!user) return;

    try {
      await supabase
        .from('perplexity_cache' as any)
        .insert({
          user_id: user.id,
          query_type: queryType,
          query_key: queryKey,
          research_data: researchData,
          citations,
        }) as any;
    } catch (error) {
      console.error('Cache save error:', error);
    }
  }, [user]);

  // Deep dive research
  const deepDive = useCallback(async (
    type: DeepDiveType,
    params: {
      company_name?: string;
      industry?: string;
      contact_name?: string;
    },
    forceRefresh = false
  ): Promise<DeepDiveResult | null> => {
    if (!user) {
      toast.error('You must be logged in');
      return null;
    }

    setIsLoading(true);

    try {
      const queryKey = `${params.company_name || ''}-${params.industry || ''}-${params.contact_name || ''}`;

      // Check cache first
      if (!forceRefresh) {
        const cached = await checkCache(type, queryKey);
        if (cached) {
          
          const result = {
            content: cached.research_data.content,
            citations: cached.citations,
            query_type: type,
          };
          setDeepDiveResult(result);
          return result;
        }
      }

      console.log('Fetching new deep dive:', type);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/perplexity-research`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            query_type: type,
            ...params,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Research failed');
      }

      const deepDiveData: DeepDiveResult = {
        content: result.content,
        citations: result.citations,
        query_type: type,
      };

      // Save to cache
      await saveToCache(type, queryKey, { content: result.content }, result.citations);

      setDeepDiveResult(deepDiveData);
      return deepDiveData;
    } catch (error) {
      console.error('Deep dive error:', error);
      toast.error('Failed to complete research. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, checkCache, saveToCache]);

  // Generate battlecard
  const generateBattlecard = useCallback(async (
    competitorName: string,
    ourCompanyName?: string
  ): Promise<Battlecard | null> => {
    if (!user) {
      toast.error('You must be logged in');
      return null;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-battlecard`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            competitor_name: competitorName,
            our_company_name: ourCompanyName,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Battlecard generation failed');
      }

      return result.battlecard as Battlecard;
    } catch (error) {
      console.error('Battlecard generation error:', error);
      toast.error('Failed to generate battlecard. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Save battlecard to toolkit
  const saveBattlecardToToolkit = useCallback(async (battlecard: Battlecard) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('toolkit_items')
        .insert({
          title: `${battlecard.competitor_name} Battlecard`,
          content: JSON.stringify(battlecard),
          item_type: 'battlecard',
          category: 'Competitor',
          metadata: {
            competitor_name: battlecard.competitor_name,
            generated_at: battlecard.generated_at,
            citations: battlecard.citations,
          },
        });

      if (error) throw error;
      toast.success('Battlecard saved to toolkit');
      return true;
    } catch (error) {
      console.error('Save battlecard error:', error);
      toast.error('Failed to save battlecard');
      return false;
    }
  }, [user]);

  return {
    isLoading,
    deepDiveResult,
    deepDive,
    generateBattlecard,
    saveBattlecardToToolkit,
    setDeepDiveResult,
  };
}
