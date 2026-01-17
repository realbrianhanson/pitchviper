import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AlowareContact {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  tags?: string[];
  createdAt?: string;
  lastContactedAt?: string;
  alowareId: string;
}

export interface ContactDetails extends AlowareContact {
  address?: string;
  city?: string;
  state?: string;
  notes?: string;
  customFields?: Record<string, any>;
  callHistory?: any[];
}

export function useContactLookup() {
  const [isSearching, setIsSearching] = useState(false);
  const [contacts, setContacts] = useState<AlowareContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const searchContacts = async (params: {
    phoneNumber?: string;
    email?: string;
    name?: string;
  }) => {
    if (!params.phoneNumber && !params.email && !params.name) {
      toast.error('Please provide a phone number, email, or name to search');
      return [];
    }

    setIsSearching(true);
    setContacts([]);

    try {
      const { data, error } = await supabase.functions.invoke('lookup-aloware-contact', {
        body: {
          action: 'lookup',
          ...params,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to search contacts');
      }

      setContacts(data.contacts);
      
      if (data.contacts.length === 0) {
        toast.info('No contacts found in Aloware');
      } else {
        toast.success(`Found ${data.contacts.length} contact(s)`);
      }

      return data.contacts;
    } catch (error: any) {
      console.error('Contact lookup error:', error);
      toast.error(error.message || 'Failed to search contacts');
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  const getContactDetails = async (contactId: string) => {
    setIsLoadingDetails(true);
    setSelectedContact(null);

    try {
      const { data, error } = await supabase.functions.invoke('lookup-aloware-contact', {
        body: {
          action: 'get-details',
          contactId,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to get contact details');
      }

      setSelectedContact(data.contact);
      return data.contact;
    } catch (error: any) {
      console.error('Get contact details error:', error);
      toast.error(error.message || 'Failed to get contact details');
      return null;
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const clearSearch = () => {
    setContacts([]);
    setSelectedContact(null);
  };

  return {
    // State
    isSearching,
    contacts,
    selectedContact,
    isLoadingDetails,
    
    // Actions
    searchContacts,
    getContactDetails,
    clearSearch,
  };
}
