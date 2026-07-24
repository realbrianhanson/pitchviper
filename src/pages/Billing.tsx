import { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useBilling } from "@/hooks/useBilling";
import {
  PLANS,
  MIN_SEATS,
  TRIAL_DAYS,
  billableSeats,
  planTotal,
  perSeatPrice,
  annualSavingsPerSeat,
  computeTrialStatus,
  statusLabel,
  formatUSD,
  type BillingInterval,
  type PlanId,
} from "@/lib/billingPlans";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";

const ACTIVE_STATES = new Set(["active", "trialing", "past_due"]);

export default function Billing() {
  const { canManageTeam, loading } = useAuth();
  const [params, setParams] = useSearchParams();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const billing = useBilling();

  const status = params.get("status");
  useEffect(() => {
    if (!status) return;
    if (status === "success") {
      toast.success("Payment received. Your plan will activate shortly.");
      billing.refresh();
    } else if (status === "canceled") {
      toast.info("Checkout canceled — no changes were made.");
    }
    // Clear the query so refresh doesn't re-toast.
    const next = new URLSearchParams(params);
    next.delete("status");
    next.delete("session_id");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const snapshot = billing.data;
  const trial = useMemo(
    () => computeTrialStatus(snapshot?.billing?.trial_ends_at ?? null),
    [snapshot?.billing?.trial_ends_at],
  );
  const actualSeats = snapshot?.actualSeats ?? 0;
  const chargedSeats = billableSeats(actualSeats);
  const currentPlan = (snapshot?.billing?.plan as PlanId | "trial" | "enterprise" | undefined) ?? "trial";
  const hasActiveSub = ACTIVE_STATES.has(snapshot?.billing?.status ?? "");

  if (loading) {
    return (
      <AppLayout title="Billing">
        <Skeleton className="h-64 w-full" />
      </AppLayout>
    );
  }
  if (!canManageTeam) return <Navigate to="/app" replace />;

  return (
    <AppLayout title="Billing">
      <div className="space-y-8">
        <header className="space-y-2">
          <div className="eyebrow">Billing</div>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight">
            Plan &amp; <span className="italic text-primary">seats</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Simple per-seat pricing. {MIN_SEATS}-seat minimum. Change or cancel anytime.
          </p>
        </header>

        {/* Current status */}
        <section className="editorial-tile p-6 md:p-8">
          {billing.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="grid gap-6 md:grid-cols-4">
              <StatusCell label="Status" value={statusLabel(snapshot?.billing?.status)} />
              <StatusCell
                label="Plan"
                value={
                  currentPlan === "trial"
                    ? `${TRIAL_DAYS}-day trial`
                    : currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)
                }
              />
              <StatusCell
                label="Trial remaining"
                value={trial.active ? `${trial.daysRemaining} days` : "—"}
              />
              <StatusCell
                label="Seats"
                value={`${actualSeats} active · ${chargedSeats} billable`}
              />
            </div>
          )}
          {snapshot?.billing?.stripe_customer_id ? (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => billing.openPortal()}
                disabled={billing.portalPending}
                className="inline-flex items-center gap-2 border border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] hover:border-primary transition-colors disabled:opacity-50"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {billing.portalPending ? "Opening…" : "Manage billing"}
              </button>
            </div>
          ) : null}
        </section>

        {/* Interval toggle */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="eyebrow">Choose a plan</div>
          <div className="inline-flex border border-border" role="tablist" aria-label="Billing interval">
            {(["monthly", "annual"] as const).map((i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={interval === i}
                onClick={() => setInterval(i)}
                className={`px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] transition-colors ${
                  interval === i ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {i === "monthly" ? (
                  "Monthly"
                ) : (
                  <>
                    <span className="sm:hidden">Annual · save 17%</span>
                    <span className="hidden sm:inline">Annual · 2 months free</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const total = planTotal(plan, interval, actualSeats);
            const per = perSeatPrice(plan, interval);
            const isCurrent = currentPlan === plan.id && hasActiveSub;
            return (
              <div
                key={plan.id}
                className={`editorial-tile p-6 flex flex-col gap-5 ${
                  plan.recommended ? "border-primary" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="eyebrow">{plan.name}</div>
                    <p className="text-sm text-muted-foreground mt-2 max-w-[28ch]">{plan.tagline}</p>
                  </div>
                  {plan.recommended && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                      Recommended
                    </span>
                  )}
                </div>

                <div>
                  <div className="font-display text-4xl tabular-nums">
                    {formatUSD(per)}
                    <span className="text-sm text-muted-foreground font-body ml-1">
                      /seat/{interval === "monthly" ? "mo" : "yr"}
                    </span>
                  </div>
                  {interval === "annual" && (
                    <div className="text-xs font-mono uppercase tracking-[0.2em] text-primary mt-1">
                      Save {formatUSD(annualSavingsPerSeat(plan))}/seat vs monthly
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground mt-3">
                    {formatUSD(total)} {interval === "monthly" ? "/month" : "/year"} for {chargedSeats}{" "}
                    seat{chargedSeats === 1 ? "" : "s"} ({MIN_SEATS}-seat minimum)
                  </div>
                </div>

                <ul className="space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  {isCurrent ? (
                    <div className="w-full text-center border border-primary text-primary px-4 py-3 font-mono text-xs uppercase tracking-[0.2em]">
                      Current plan
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => billing.startCheckout({ plan: plan.id, interval })}
                      disabled={billing.checkoutPending}
                      className="w-full bg-primary text-primary-foreground px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] hover:brightness-110 transition-all disabled:opacity-50"
                    >
                      {billing.checkoutPending ? "Redirecting…" : `Choose ${plan.name}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Enterprise */}
          <div className="editorial-tile p-6 flex flex-col gap-5">
            <div>
              <div className="eyebrow">Enterprise</div>
              <p className="text-sm text-muted-foreground mt-2 max-w-[28ch]">
                Custom onboarding and terms for larger sales orgs.
              </p>
            </div>
            <div className="font-display text-4xl">Custom</div>
            <ul className="space-y-2 text-sm">
              {[
                "Guided onboarding & data mapping",
                "Integration assistance",
                "Extended audit history",
                "Priority support",
                "Volume pricing",
              ].map((f) => (
                <li key={f} className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <a
              href="mailto:sales@pitchviper.com?subject=Enterprise%20inquiry"
              className="mt-auto w-full text-center border border-border px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] hover:border-primary transition-colors"
            >
              Talk to sales
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Payments processed securely by Stripe. Card details never touch our servers.
        </div>
      </div>
    </AppLayout>
  );
}

function StatusCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="font-display text-2xl mt-2 tabular-nums">{value}</div>
    </div>
  );
}
