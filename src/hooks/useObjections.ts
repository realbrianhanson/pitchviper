import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useQueryClient } from '@tanstack/react-query';

export type ObjectionCategory = 'price' | 'timing' | 'competition' | 'authority' | 'need' | 'trust' | 'stall';
export type ObjectionDifficulty = 'easy' | 'medium' | 'hard';
export type ResponseApproach = 'empathy' | 'logic' | 'redirect' | 'question' | 'social_proof';

export interface ObjectionResponse {
  id: string;
  objection_id: string;
  response_text: string;
  approach: ResponseApproach;
  created_by: string | null;
  upvotes: number;
  downvotes: number;
  times_used: number;
  times_successful: number;
  created_at: string;
  creator_profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface Objection {
  id: string;
  objection_text: string;
  category: ObjectionCategory;
  difficulty: ObjectionDifficulty;
  context: string | null;
  created_by: string | null;
  team_id: string | null;
  usage_count: number;
  is_approved: boolean;
  created_at: string;
  responses: ObjectionResponse[];
  average_rating: number;
}

export type SortOption = 'most_used' | 'highest_rated' | 'recently_added';

export function useObjections() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [objections, setObjections] = useState<Objection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<ObjectionCategory[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<ObjectionDifficulty[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('most_used');

  const fetchObjections = async () => {
    setIsLoading(true);
    try {
      // Fetch objections - cast to any until types regenerate
      const { data: objectionsData, error: objectionsError } = await (supabase
        .from('objections' as any)
        .select('*')
        .eq('is_approved', true)) as any;

      if (objectionsError) throw objectionsError;

      // Fetch responses for all objections
      const { data: responsesData, error: responsesError } = await (supabase
        .from('objection_responses' as any)
        .select('*')) as any;

      if (responsesError) throw responsesError;

      // Combine data
      const combinedObjections: Objection[] = (objectionsData || []).map(obj => {
        const objResponses = (responsesData || []).filter(r => r.objection_id === obj.id);
        const totalVotes = objResponses.reduce((sum, r) => sum + r.upvotes + r.downvotes, 0);
        const positiveVotes = objResponses.reduce((sum, r) => sum + r.upvotes, 0);
        const averageRating = totalVotes > 0 ? (positiveVotes / totalVotes) * 5 : 4;

        return {
          ...obj,
          category: obj.category as ObjectionCategory,
          difficulty: obj.difficulty as ObjectionDifficulty,
          responses: objResponses.map(r => ({
            ...r,
            approach: r.approach as ResponseApproach
          })),
          average_rating: averageRating
        };
      });

      setObjections(combinedObjections);
    } catch (error) {
      console.error('Error fetching objections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchObjections();
  }, []);

  // Filter and sort objections
  const filteredObjections = objections
    .filter(obj => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesText = obj.objection_text.toLowerCase().includes(query);
        const matchesContext = obj.context?.toLowerCase().includes(query);
        const matchesResponse = obj.responses.some(r => 
          r.response_text.toLowerCase().includes(query)
        );
        if (!matchesText && !matchesContext && !matchesResponse) return false;
      }

      // Category filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(obj.category)) {
        return false;
      }

      // Difficulty filter
      if (selectedDifficulties.length > 0 && !selectedDifficulties.includes(obj.difficulty)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'most_used':
          return b.usage_count - a.usage_count;
        case 'highest_rated':
          return b.average_rating - a.average_rating;
        case 'recently_added':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

  const addObjection = async (data: {
    objection_text: string;
    category: ObjectionCategory;
    difficulty: ObjectionDifficulty;
    context?: string;
  }) => {
    if (!user) return;

    // Fetch caller team so the row satisfies the tenant-tagged INSERT policy.
    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const { error } = await (supabase
      .from('objections' as any)
      .insert({
        ...data,
        created_by: user.id,
        team_id: profile?.team_id ?? null,
      })) as any;

    if (!error) {
      fetchObjections();
    }
    return !error;
  };

  const addResponse = async (objectionId: string, data: {
    response_text: string;
    approach: ResponseApproach;
  }) => {
    if (!user) return;

    const { error } = await (supabase
      .from('objection_responses' as any)
      .insert({
        objection_id: objectionId,
        ...data,
        created_by: user.id
      })) as any;

    if (!error) {
      fetchObjections();
    }
    return !error;
  };

  const voteResponse = async (responseId: string, isUpvote: boolean) => {
    const response = objections
      .flatMap(o => o.responses)
      .find(r => r.id === responseId);

    if (!response) return;

    const { error } = await (supabase
      .from('objection_responses' as any)
      .update({
        upvotes: isUpvote ? response.upvotes + 1 : response.upvotes,
        downvotes: !isUpvote ? response.downvotes + 1 : response.downvotes
      })
      .eq('id', responseId)) as any;

    if (!error) {
      fetchObjections();
    }
  };

  const incrementUsage = async (objectionId: string, responseId?: string) => {
    const objection = objections.find(o => o.id === objectionId);
    if (!objection) return;

    await (supabase
      .from('objections' as any)
      .update({ usage_count: objection.usage_count + 1 })
      .eq('id', objectionId)) as any;

    if (responseId) {
      const response = objection.responses.find(r => r.id === responseId);
      if (response) {
        await (supabase
          .from('objection_responses' as any)
          .update({ times_used: response.times_used + 1 })
          .eq('id', responseId)) as any;
      }
    }

    fetchObjections();
  };

  return {
    objections: filteredObjections,
    allObjections: objections,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedCategories,
    setSelectedCategories,
    selectedDifficulties,
    setSelectedDifficulties,
    sortBy,
    setSortBy,
    addObjection,
    addResponse,
    voteResponse,
    incrementUsage,
    refetch: fetchObjections
  };
}
