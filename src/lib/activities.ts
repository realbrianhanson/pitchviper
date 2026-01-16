import { supabase } from "@/integrations/supabase/client";

type ActivityType =
  | "call_made"
  | "call_received"
  | "appointment_set"
  | "deal_closed"
  | "deal_lost"
  | "roleplay_completed"
  | "badge_earned"
  | "level_up"
  | "training_completed";

interface LogActivityParams {
  type: ActivityType;
  metadata?: Record<string, any>;
}

export async function logActivity({ type, metadata = {} }: LogActivityParams) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase.rpc("log_activity", {
    p_user_id: user.id,
    p_activity_type: type,
    p_metadata: metadata,
  });

  if (error) {
    throw error;
  }

  return data;
}

// Convenience functions
export const logCall = (company: string, duration_minutes: number = 0) =>
  logActivity({
    type: "call_made",
    metadata: { company, duration_minutes },
  });

export const logAppointment = (company: string, contact: string, date: string) =>
  logActivity({
    type: "appointment_set",
    metadata: { company, contact, appointment_date: date },
  });

export const logDealClosed = (company: string, value: number) =>
  logActivity({
    type: "deal_closed",
    metadata: { company, value },
  });

export const logDealLost = (company: string, reason?: string) =>
  logActivity({
    type: "deal_lost",
    metadata: { company, reason },
  });

export const logRoleplayCompleted = (scenario: string, score: number) =>
  logActivity({
    type: "roleplay_completed",
    metadata: { scenario, score },
  });

export const logBadgeEarned = (badge_name: string, xp_earned: number) =>
  logActivity({
    type: "badge_earned",
    metadata: { badge_name, xp_earned },
  });

export const logTrainingCompleted = (training_name: string, score?: number) =>
  logActivity({
    type: "training_completed",
    metadata: { training_name, score },
  });