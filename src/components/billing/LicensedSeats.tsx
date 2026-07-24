import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEntitlement } from "@/hooks/useEntitlement";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { parseFunctionErrorCode } from "@/lib/billingErrors";
import {
  MIN_SEATS,
  MAX_SEATS,
  PLANS,
  perSeatPrice,
  formatUSD,
  type BillingInterval,
  type PlanId,
} from "@/lib/billingPlans";

const SEAT_ERROR_LABELS: Record<string, string> = {
  seats_below_used: "You can't reduce below current team size.",
  seats_above_max: `Maximum is ${MAX_SEATS} seats.`,
  no_subscription: "No active subscription.",
  subscription_inactive: "Subscription is not active.",
  subscription_item_missing: "Subscription setup issue. Contact support.",
  invalid_plan: "Subscription price isn't recognized. Contact support.",
  forbidden: "Only managers can update seats.",
  unauthorized: "Please sign in again.",
  invalid_body: "Enter a valid seat count.",
  billing_not_configured: "Billing is not configured yet.",
  apply_failed: "Update didn't take effect. Try again.",
  rate_limited: "Too many attempts. Try again shortly.",
};

export function LicensedSeats() {
  const { data: ent, refetch } = useEntitlement();
  const { canManageTeam } = useAuth();
  const qc = useQueryClient();
  const initial =
    ent?.seat_limit && ent.seat_limit > 0
      ? ent.seat_limit
      : Math.max(MIN_SEATS, ent?.used_seats ?? MIN_SEATS);
  const [seats, setSeats] = useState<number>(initial);
  const [pending, setPending] = useState(false);

  const plan = (ent?.plan ?? "starter") as PlanId;
  const interval = (ent?.interval ?? "monthly") as BillingInterval;
  const planDef = useMemo(() => PLANS.find((p) => p.id === plan) ?? PLANS[0], [plan]);
  const perSeat = perSeatPrice(planDef, interval);

  if (!ent) return null;
  const used = ent.used_seats;

  if (ent.reason === "trial") {
    return (
      <section className="editorial-tile p-6 md:p-8">
        <div className="eyebrow mb-2">Licensed seats</div>
        <p className="text-muted-foreground">
          Up to <span className="text-foreground">25 teammates</span> during trial. Choose a plan below to
          lock in permanent seats.
        </p>
        <p className="mt-2 text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground">
          {used} / 25 seats used
        </p>
      </section>
    );
  }

  if (!ent.access || ent.seat_limit === 0) return null;

  const minAllowed = Math.max(MIN_SEATS, used);
  const clamped = Math.max(minAllowed, Math.min(MAX_SEATS, seats || 0));
  const disabled = !canManageTeam || pending || clamped === ent.seat_limit;
  const estimatedTotal = perSeat * clamped;
  const intervalLabel = interval === "annual" ? "/ year" : "/ month";

  const submit = async () => {
    if (!canManageTeam) return;
    setPending(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-stripe-seats", {
        body: { seats: clamped },
      });
      if (error) {
        const code = await parseFunctionErrorCode(error);
        throw new Error(code);
      }
      const payload = data as { error?: string; seats?: number };
      if (payload?.error) throw new Error(payload.error);
      toast.success(`Seats updated to ${payload.seats ?? clamped}`);
      await refetch();
      qc.invalidateQueries({ queryKey: ["billing"] });
    } catch (err) {
      const code = (err as Error).message;
      toast.error(SEAT_ERROR_LABELS[code] ?? "Unable to update seats.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="editorial-tile p-6 md:p-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="eyebrow mb-2">Licensed seats</div>
          <p className="text-muted-foreground text-sm">
            <span className="text-foreground font-mono">{used}</span> used of{" "}
            <span className="text-foreground font-mono">{ent.seat_limit}</span> licensed.
            {" "}Add licenses before inviting new teammates. Reductions can't go below current members.
          </p>
          <p className="mt-2 text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground">
            Estimated: {formatUSD(estimatedTotal)} {intervalLabel} · {formatUSD(perSeat)} / seat
          </p>
        </div>
        {canManageTeam ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={minAllowed}
              max={MAX_SEATS}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value) || 0)}
              className="w-24 h-10 border border-border bg-background px-3 font-mono text-sm text-right"
              aria-label="Licensed seats"
            />
            <Button onClick={submit} disabled={disabled} size="sm">
              {pending ? "Updating…" : "Update seats"}
            </Button>
          </div>
        ) : (
          <p className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground">
            Ask a manager to add seats
          </p>
        )}
      </div>
    </section>
  );
}
