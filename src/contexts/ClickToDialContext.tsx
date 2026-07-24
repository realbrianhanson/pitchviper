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

export interface ManualLogInitialData {
  contactName?: string;
  companyName?: string;
  phoneNumber?: string;
  direction?: 'outbound' | 'inbound';
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

  // Manual call logging (opened from DialModal handoff)
  isManualLogOpen: boolean;
  manualLogInitial: ManualLogInitialData | null;
  openManualLog: (initial?: ManualLogInitialData) => void;
  closeManualLog: () => void;

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
        .maybeSingle();

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

  const openExternalDialer = useCallback(() => {
    if (typeof window !== "undefined") {
      window.open("https://app.dialer.io", "_blank", "noopener,noreferrer");
    }
  }, []);

  const initiateCall = useCallback(async (params: DialParams) => {
    // No verified in-app telephony adapter — hand off to the external dialer
    // and surface a neutral, provider-agnostic message. Never invoke
    // legacy Aloware edge functions from user actions.
    setIsDialing(true);
    try {
      openExternalDialer();
      toast({
        title: "Opened your phone system",
        description: `Dial ${params.contactName || params.phoneNumber} from your phone system, then log the call here.`,
      });
      closeDialModal();
      return { success: true };
    } finally {
      setIsDialing(false);
    }
  }, [toast, closeDialModal, openExternalDialer]);

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

  const addToPowerDialer = useCallback(async (contacts: PowerDialerContact[], _position: 'top' | 'bottom' = 'bottom') => {
    // Power-dialer queueing requires a native adapter that isn't wired up.
    // Fail neutrally and point the user at their phone system.
    openExternalDialer();
    toast({
      title: "Open your phone system",
      description: `Queue ${contacts.length} contact${contacts.length === 1 ? "" : "s"} directly in your phone system.`,
    });
    return { success: false, error: "provider_unavailable" };
  }, [toast, openExternalDialer]);

  // SMS functions
  const openSMSModal = useCallback((params: SMSParams) => {
    setPendingSMS(params);
    setIsSMSModalOpen(true);
  }, []);

  const closeSMSModal = useCallback(() => {
    setIsSMSModalOpen(false);
    setPendingSMS(null);
  }, []);

  const sendSMS = useCallback(async (phoneNumber: string, _message: string, contactName?: string, _dealId?: string) => {
    setIsSendingSMS(true);
    try {
      openExternalDialer();
      toast({
        title: "Open your phone system",
        description: `Send the message to ${contactName || phoneNumber} from your phone system.`,
      });
      closeSMSModal();
      return { success: false, error: "provider_unavailable" };
    } finally {
      setIsSendingSMS(false);
    }
  }, [toast, closeSMSModal, openExternalDialer]);

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
