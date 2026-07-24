import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Entitlement {
  access: boolean;
  reason:
    | "ok" | "trial" | "trial_expired" | "active" | "cancel_at_period_end"
    | "past_due_grace" | "no_team" | "no_billing" | "expired"
    | "unauthenticated" | "unknown_status";
  plan: "starter" | "growth";
  tier: "starter" | "growth";
  interval: "monthly" | "annual";
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  seat_limit: number;
  used_seats: number;
  can_manage: boolean;
}

const DEFAULT: Entitlement = {
  access: false,
  reason: "no_billing",
  plan: "starter",
  tier: "starter",
  interval: "monthly",
  status: "unknown",
  trial_ends_at: null,
  current_period_end: null,
  cancel_at_period_end: false,
  seat_limit: 0,
  used_seats: 0,
  can_manage: false,
};

/** Caller-scoped entitlement. Never accepts team/plan input from callers. */
export function useEntitlement() {
  const { user, profileLoaded } = useAuth();
  return useQuery<Entitlement>({
    queryKey: ["entitlement", user?.id ?? null],
    enabled: Boolean(user && profileLoaded),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_entitlement");
      if (error) throw error;
      const raw = (data ?? {}) as Partial<Entitlement>;
      return { ...DEFAULT, ...raw } as Entitlement;
    },
  });
}

/** True if the entitlement grants access to any Growth-tier feature. */
export function isGrowthTier(ent: Entitlement | null | undefined): boolean {
  return Boolean(ent?.access && ent?.tier === "growth");
}

/** Days remaining in trial (0 if not on trial). */
export function trialDaysRemaining(ent: Entitlement | null | undefined): number {
  if (!ent?.trial_ends_at || ent.reason !== "trial") return 0;
  const ms = new Date(ent.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
