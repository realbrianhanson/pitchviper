import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export type CallDirection = 'inbound' | 'outbound';
export type CallOutcome = 'connected' | 'voicemail' | 'no_answer' | 'wrong_number';
export type CallPurpose = 'cold_call' | 'follow_up' | 'appointment' | 'demo' | 'closing' | 'support';

export interface CallFormData {
  // Step 1: Basic Info
  contactName: string;
  companyName: string;
  phoneNumber: string;
  direction: CallDirection;
  durationSeconds: number;
  outcome: CallOutcome;
  
  // Step 2: Call Details (only if connected)
  callPurpose?: CallPurpose;
  disposition?: string;
  appointmentScheduledAt?: Date;
  callbackScheduledAt?: Date;
  dealValue?: number;
  notes?: string;
  
  // Step 3: Self Assessment
  selfRating?: number;
  struggledObjections?: string[];
  improvementNotes?: string;
}

const COMMON_OBJECTIONS = [
  "Too expensive",
  "Need to think about it",
  "Using competitor",
  "Not the decision maker",
  "Bad timing",
  "No budget",
  "Need to consult team",
  "Already have solution",
  "Not interested",
  "Call back later"
];

export const useCallLogging = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);

  const logCallMutation = useMutation({
    mutationFn: async (data: CallFormData) => {
      if (!user) throw new Error('Not authenticated');

      // Get user's team_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Insert call record
      const { data: call, error } = await supabase
        .from('calls')
        .insert({
          user_id: user.id,
          team_id: profile?.team_id,
          contact_name: data.contactName,
          company_name: data.companyName || null,
          phone_number: data.phoneNumber || null,
          direction: data.direction,
          duration_seconds: data.durationSeconds,
          outcome: data.outcome,
          call_purpose: data.callPurpose || null,
          disposition: data.disposition || null,
          appointment_scheduled_at: data.appointmentScheduledAt?.toISOString() || null,
          callback_scheduled_at: data.callbackScheduledAt?.toISOString() || null,
          deal_value: data.dealValue || null,
          notes: data.notes || null,
          self_rating: data.selfRating || null,
          struggled_objections: data.struggledObjections || null,
          improvement_notes: data.improvementNotes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity based on direction
      const activityType = data.direction === 'outbound' ? 'call_made' : 'call_received';
      await supabase.rpc('log_activity', {
        p_user_id: user.id,
        p_activity_type: activityType,
        p_metadata: {
          duration_minutes: Math.round(data.durationSeconds / 60),
          outcome: data.outcome,
          contact_name: data.contactName,
          disposition: data.disposition,
        }
      });

      // If deal closed, log that too
      if (data.disposition === 'deal_closed' && data.dealValue) {
        await supabase.rpc('log_activity', {
          p_user_id: user.id,
          p_activity_type: 'deal_closed',
          p_metadata: {
            value: data.dealValue,
            contact_name: data.contactName,
          }
        });
      }

      // If appointment set, log that
      if (data.disposition === 'appointment_set') {
        await supabase.rpc('log_activity', {
          p_user_id: user.id,
          p_activity_type: 'appointment_set',
          p_metadata: {
            scheduled_at: data.appointmentScheduledAt?.toISOString(),
            contact_name: data.contactName,
          }
        });
      }

      // Add XP to user profile
      const xpEarned = 10; // Base XP for logging a call
      await supabase
        .from('profiles')
        .update({ 
          xp_points: (await supabase.from('profiles').select('xp_points').eq('user_id', user.id).single()).data?.xp_points + xpEarned 
        })
        .eq('user_id', user.id);

      return { call, xpEarned };
    },
    onSuccess: ({ xpEarned }) => {
      queryClient.invalidateQueries({ queryKey: ['daily-stats'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      toast({
        title: "Call logged! 🎯",
        description: `+${xpEarned} XP earned`,
      });
    },
    onError: (error) => {
      console.error('Error logging call:', error);
      toast({
        title: "Error logging call",
        description: "Please try again",
        variant: "destructive",
      });
    }
  });

  return {
    currentStep,
    setCurrentStep,
    logCall: logCallMutation.mutate,
    isLogging: logCallMutation.isPending,
    commonObjections: COMMON_OBJECTIONS,
  };
};
