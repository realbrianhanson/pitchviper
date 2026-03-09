import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface CompanyOverview {
  name: string;
  industry: string;
  size?: string;
  location?: string;
  recentNews?: string[];
  logoUrl?: string;
}

export interface WhatTheyDo {
  description: string;
  products?: string[];
  targetMarket?: string;
}

export interface PainPoint {
  pain: string;
  implication?: string;
}

export interface TalkingPoint {
  topic: string;
  opener: string;
  context?: string;
}

export interface ContactIntel {
  role?: string;
  priorities?: string[];
  communicationStyle?: string;
  tips?: string[];
}

export interface ResearchData {
  companyOverview: CompanyOverview;
  whatTheyDo: WhatTheyDo;
  painPoints: PainPoint[];
  talkingPoints: TalkingPoint[];
  contactIntel?: ContactIntel;
  metadata?: {
    scrapedAt: string;
    sourceUrl?: string;
    hasContactInfo: boolean;
  };
}

export interface ProspectResearch {
  id: string;
  user_id: string;
  company_name: string;
  company_url?: string;
  contact_name?: string;
  contact_linkedin_url?: string;
  research_data: ResearchData;
  created_at: string;
  expires_at: string;
}

export function useProspectResearch() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [research, setResearch] = useState<ProspectResearch | null>(null);

  // Check for cached research
  const checkCachedResearch = useCallback(async (companyName: string): Promise<ProspectResearch | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('prospect_research' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('company_name', companyName)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1) as any;

      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Error checking cached research:', error);
      return null;
    }
  }, [user]);

  // Research a prospect
  const researchProspect = useCallback(async (
    companyName: string,
    companyUrl?: string,
    contactName?: string,
    contactLinkedInUrl?: string,
    forceRefresh = false
  ): Promise<ResearchData | null> => {
    if (!user) {
      toast.error('You must be logged in to research prospects');
      return null;
    }

    setIsLoading(true);

    try {
      // Check cache first unless force refresh
      if (!forceRefresh) {
        const cached = await checkCachedResearch(companyName);
        if (cached) {
          
          setResearch(cached);
          return cached.research_data;
        }
      }

      console.log('Fetching new research for', companyName);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-prospect`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            company_name: companyName,
            company_url: companyUrl,
            contact_name: contactName,
            contact_linkedin_url: contactLinkedInUrl,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to research prospect');
      }

      // Save to database
      const { data: savedResearch, error: saveError } = await supabase
        .from('prospect_research' as any)
        .insert({
          user_id: user.id,
          company_name: companyName,
          company_url: companyUrl,
          contact_name: contactName,
          contact_linkedin_url: contactLinkedInUrl,
          research_data: result.data,
        })
        .select()
        .single() as any;

      if (saveError) {
        console.error('Error saving research:', saveError);
      } else {
        setResearch(savedResearch);
      }

      return result.data as ResearchData;
    } catch (error) {
      console.error('Error researching prospect:', error);
      toast.error('Failed to research prospect. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, checkCachedResearch]);

  // Delete cached research
  const deleteResearch = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('prospect_research' as any)
        .delete()
        .eq('id', id) as any;

      if (error) throw error;
      
      if (research?.id === id) {
        setResearch(null);
      }
    } catch (error) {
      console.error('Error deleting research:', error);
    }
  }, [research]);

  // Copy research to clipboard
  const copyToClipboard = useCallback(async (researchData: ResearchData) => {
    const text = `
PROSPECT RESEARCH: ${researchData.companyOverview.name}
========================================

COMPANY OVERVIEW
Industry: ${researchData.companyOverview.industry}
${researchData.companyOverview.size ? `Size: ${researchData.companyOverview.size}` : ''}
${researchData.companyOverview.location ? `Location: ${researchData.companyOverview.location}` : ''}

WHAT THEY DO
${researchData.whatTheyDo.description}
${researchData.whatTheyDo.products?.length ? `Products: ${researchData.whatTheyDo.products.join(', ')}` : ''}
${researchData.whatTheyDo.targetMarket ? `Target Market: ${researchData.whatTheyDo.targetMarket}` : ''}

POTENTIAL PAIN POINTS
${researchData.painPoints.map((p, i) => `${i + 1}. ${p.pain}${p.implication ? ` - ${p.implication}` : ''}`).join('\n')}

TALKING POINTS
${researchData.talkingPoints.map((t, i) => `${i + 1}. ${t.topic}: "${t.opener}"`).join('\n')}

${researchData.contactIntel ? `
CONTACT INTEL
${researchData.contactIntel.role ? `Role: ${researchData.contactIntel.role}` : ''}
${researchData.contactIntel.priorities?.length ? `Priorities: ${researchData.contactIntel.priorities.join(', ')}` : ''}
${researchData.contactIntel.communicationStyle ? `Style: ${researchData.contactIntel.communicationStyle}` : ''}
` : ''}
`.trim();

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Research copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  }, []);

  return {
    isLoading,
    research,
    researchProspect,
    checkCachedResearch,
    deleteResearch,
    copyToClipboard,
    setResearch,
  };
}
