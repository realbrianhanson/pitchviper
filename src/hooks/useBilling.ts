import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import {
  type BillingInterval,
  type PlanId,
  isSafeStripeUrl,
} from "@/lib/billingPlans";
import { parseFunctionErrorCode } from "@/lib/billingErrors";

export interface TeamBillingRow {
  team_id: string;
  plan: string;
  status: string;
  billing_interval: string;
  seat_limit: number;
  subscription_quantity: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  trial_ends_at: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  last_webhook_at: string | null;
}

export interface BillingSnapshot {
  billing: TeamBillingRow | null;
  actualSeats: number;
}

export function useBilling() {
  const { user, canManageTeam, profile } = useAuth();
  const teamId = profile?.team_id ?? null;
  const enabled = Boolean(user && canManageTeam && teamId);
  const qc = useQueryClient();

  const query = useQuery<BillingSnapshot>({
    queryKey: ["billing", teamId],
    enabled,
    queryFn: async () => {
      const [billingRes, membersRes] = await Promise.all([
        supabase.from("team_billing").select("*").eq("team_id", teamId!).maybeSingle(),
        supabase
          .from("profiles")
          .select("user_id", { count: "exact", head: true })
          .eq("team_id", teamId!),
      ]);
      if (billingRes.error) throw billingRes.error;
      return {
        billing: (billingRes.data as TeamBillingRow | null) ?? null,
        actualSeats: membersRes.count ?? 0,
      };
    },
  });

  const checkout = useMutation({
    mutationFn: async (input: { plan: PlanId; interval: BillingInterval }) => {
      const { data, error } = await supabase.functions.invoke<{
        url?: string;
        error?: string;
      }>("create-stripe-checkout", { body: input });
      if (error) {
        throw new Error(await parseFunctionErrorCode(error));
      }
      if (!data?.url) throw new Error(data?.error ?? "internal_error");
      if (!isSafeStripeUrl(data.url)) throw new Error("invalid_url");
      return data.url;
    },
    onSuccess: (url) => {
      window.location.assign(url);
    },
    onError: (err: Error) => {
      const code = err.message;
      if (code === "billing_not_configured") {
        toast.error("Secure billing is being configured. Please try again shortly.");
      } else if (code === "use_billing_portal") {
        toast.info("You already have an active subscription. Opening billing portal.");
        portal.mutate();
      } else if (code === "forbidden") {
        toast.error("Only managers can start a subscription.");
      } else {
        toast.error("We couldn't start checkout. Please try again.");
      }
    },
  });

  const portal = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
        "create-stripe-portal",
        { body: {} },
      );
      if (error) {
        throw new Error(await parseFunctionErrorCode(error));
      }
      if (!data?.url) throw new Error(data?.error ?? "internal_error");
      if (!isSafeStripeUrl(data.url)) throw new Error("invalid_url");
      return data.url;
    },
    onSuccess: (url) => window.location.assign(url),
    onError: (err: Error) => {
      const code = err.message;
      if (code === "billing_not_configured") {
        toast.error("Secure billing is being configured. Please try again shortly.");
      } else if (code === "no_customer") {
        toast.error("No billing profile yet — pick a plan to get started.");
      } else {
        toast.error("We couldn't open the billing portal. Please try again.");
      }
    },
  });

  return {
    ...query,
    enabled,
    refresh: () => qc.invalidateQueries({ queryKey: ["billing", teamId] }),
    startCheckout: checkout.mutate,
    checkoutPending: checkout.isPending,
    openPortal: portal.mutate,
    portalPending: portal.isPending,
  };
}
