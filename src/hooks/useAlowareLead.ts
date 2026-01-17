import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateLeadParams {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  notes?: string;
  tags?: string[];
  dealId?: string;
  assignToUser?: boolean;
}

interface AlowareLead {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  email?: string;
  phone?: string;
  company?: string;
}

export function useAlowareLead() {
  const [isCreating, setIsCreating] = useState(false);

  const createLead = async (params: CreateLeadParams): Promise<AlowareLead | null> => {
    if (!params.phone && !params.email) {
      toast.error('Phone or email is required to create a lead');
      return null;
    }

    setIsCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-aloware-lead', {
        body: params,
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to create lead');
      }

      toast.success('Contact pushed to Aloware!');
      return data.contact;
    } catch (error: any) {
      console.error('Create lead error:', error);
      toast.error(error.message || 'Failed to create lead in Aloware');
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    isCreating,
    createLead,
  };
}
