import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface CallState {
  isActive: boolean;
  callId: string | null;
  contactName: string;
  phoneNumber: string;
  startTime: Date | null;
  notes: string;
}

interface DialParams {
  phoneNumber: string;
  contactName?: string;
  companyName?: string;
  linePhoneNumber?: string;
  dealId?: string;
}

interface SMSParams {
  phoneNumber: string;
  contactName?: string;
  companyName?: string;
  dealId?: string;
}

interface PowerDialerContact {
  phoneNumber: string;
  name?: string;
  companyName?: string;
  email?: string;
}

interface ClickToDialContextType {
  // Dial modal
  isDialModalOpen: boolean;
  openDialModal: (params: DialParams) => void;
  closeDialModal: () => void;
  pendingDial: DialParams | null;
  
  // Call initiation
  isDialing: boolean;
  initiateCall: (params: DialParams) => Promise<{ success: boolean; error?: string }>;
  
  // Active call
  callState: CallState;
  endCall: () => Promise<void>;
  updateCallNotes: (notes: string) => void;
  
  // Power dialer
  addToPowerDialer: (contacts: PowerDialerContact[], position?: 'top' | 'bottom') => Promise<{ success: boolean; added?: any[]; failed?: any[]; error?: string }>;
  
  // SMS
  isSMSModalOpen: boolean;
  openSMSModal: (params: SMSParams) => void;
  closeSMSModal: () => void;
  pendingSMS: SMSParams | null;
  isSendingSMS: boolean;
  sendSMS: (phoneNumber: string, message: string, contactName?: string, dealId?: string) => Promise<{ success: boolean; error?: string }>;
}

const ClickToDialContext = createContext<ClickToDialContextType | undefined>(undefined);

export function ClickToDialProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDialing, setIsDialing] = useState(false);
  const [isDialModalOpen, setIsDialModalOpen] = useState(false);
  const [pendingDial, setPendingDial] = useState<DialParams | null>(null);
  const [callState, setCallState] = useState<CallState>({
    isActive: false,
    callId: null,
    contactName: '',
    phoneNumber: '',
    startTime: null,
    notes: '',
  });

  // SMS state
  const [isSMSModalOpen, setIsSMSModalOpen] = useState(false);
  const [pendingSMS, setPendingSMS] = useState<SMSParams | null>(null);
  const [isSendingSMS, setIsSendingSMS] = useState(false);

  // Check for active call on mount
  useEffect(() => {
    const checkActiveCall = async () => {
      if (!user) return;

      const { data: status } = await supabase
        .from('user_status')
        .select('status, current_call_started_at')
        .eq('user_id', user.id)
        .single();

      if (status?.status === 'on_call' && status.current_call_started_at) {
        setCallState(prev => ({
          ...prev,
          isActive: true,
          startTime: new Date(status.current_call_started_at),
        }));
      }
    };

    checkActiveCall();
  }, [user]);

  const openDialModal = useCallback((params: DialParams) => {
    setPendingDial(params);
    setIsDialModalOpen(true);
  }, []);

  const closeDialModal = useCallback(() => {
    setIsDialModalOpen(false);
    setPendingDial(null);
  }, []);

  const initiateCall = useCallback(async (params: DialParams) => {
    setIsDialing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('initiate-aloware-call', {
        body: {
          contactPhoneNumber: params.phoneNumber,
          linePhoneNumber: params.linePhoneNumber,
          contactName: params.contactName,
          companyName: params.companyName,
          dealId: params.dealId,
        },
      });

      if (error) throw error;

      if (data.success) {
        setCallState({
          isActive: true,
          callId: data.callId,
          contactName: params.contactName || 'Unknown',
          phoneNumber: params.phoneNumber,
          startTime: new Date(),
          notes: '',
        });

        toast({
          title: "Call Initiated",
          description: `Connecting to ${params.contactName || params.phoneNumber}...`,
        });

        closeDialModal();
        return { success: true };
      } else {
        toast({
          title: "Call Failed",
          description: data.error || "Failed to initiate call",
          variant: "destructive",
        });
        return { success: false, error: data.error };
      }
    } catch (error: any) {
      toast({
        title: "Call Error",
        description: error.message || "Failed to initiate call",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsDialing(false);
    }
  }, [toast, closeDialModal]);

  const endCall = useCallback(async () => {
    if (!user) return;

    await supabase.rpc('update_user_status', {
      p_user_id: user.id,
      p_status: 'available',
    });

    if (callState.callId && callState.startTime) {
      const durationSeconds = Math.floor((Date.now() - callState.startTime.getTime()) / 1000);
      
      await supabase
        .from('calls')
        .update({ 
          duration_seconds: durationSeconds,
          notes: callState.notes || null,
        })
        .eq('id', callState.callId);
    }

    setCallState({
      isActive: false,
      callId: null,
      contactName: '',
      phoneNumber: '',
      startTime: null,
      notes: '',
    });

    toast({
      title: "Call Ended",
      description: "Call has been logged",
    });
  }, [user, callState, toast]);

  const updateCallNotes = useCallback((notes: string) => {
    setCallState(prev => ({ ...prev, notes }));
  }, []);

  const addToPowerDialer = useCallback(async (contacts: PowerDialerContact[], position: 'top' | 'bottom' = 'bottom') => {
    try {
      const { data, error } = await supabase.functions.invoke('add-to-aloware-powerdialer', {
        body: { contacts, position },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Added to Power Dialer",
          description: data.message,
        });
        return { success: true, added: data.added, failed: data.failed };
      } else {
        toast({
          title: "Power Dialer Error",
          description: data.error,
          variant: "destructive",
        });
        return { success: false, error: data.error };
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add to power dialer",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    }
  }, [toast]);

  // SMS functions
  const openSMSModal = useCallback((params: SMSParams) => {
    setPendingSMS(params);
    setIsSMSModalOpen(true);
  }, []);

  const closeSMSModal = useCallback(() => {
    setIsSMSModalOpen(false);
    setPendingSMS(null);
  }, []);

  const sendSMS = useCallback(async (phoneNumber: string, message: string, contactName?: string, dealId?: string) => {
    setIsSendingSMS(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-aloware-sms', {
        body: {
          phoneNumber,
          message,
          contactName,
          dealId,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "SMS Sent",
          description: `Message sent to ${contactName || phoneNumber}`,
        });
        closeSMSModal();
        return { success: true };
      } else {
        toast({
          title: "SMS Failed",
          description: data.error || "Failed to send SMS",
          variant: "destructive",
        });
        return { success: false, error: data.error };
      }
    } catch (error: any) {
      toast({
        title: "SMS Error",
        description: error.message || "Failed to send SMS",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsSendingSMS(false);
    }
  }, [toast, closeSMSModal]);

  return (
    <ClickToDialContext.Provider
      value={{
        isDialModalOpen,
        openDialModal,
        closeDialModal,
        pendingDial,
        isDialing,
        initiateCall,
        callState,
        endCall,
        updateCallNotes,
        addToPowerDialer,
        // SMS
        isSMSModalOpen,
        openSMSModal,
        closeSMSModal,
        pendingSMS,
        isSendingSMS,
        sendSMS,
      }}
    >
      {children}
    </ClickToDialContext.Provider>
  );
}

export function useClickToDialContext() {
  const context = useContext(ClickToDialContext);
  if (context === undefined) {
    throw new Error('useClickToDialContext must be used within a ClickToDialProvider');
  }
  return context;
}
