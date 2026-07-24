import { Link } from "react-router-dom";
import { useBilling } from "@/hooks/useBilling";
import { computeTrialStatus, statusLabel } from "@/lib/billingPlans";
import { CreditCard } from "lucide-react";

/**
 * Subtle trial/status strip for the ManagerDashboard. Hides itself when the
 * team already has an active paid subscription that isn't past due, or when
 * we don't have billing data yet.
 */
export function BillingStatusStrip() {
  const { data, isLoading } = useBilling();
  if (isLoading || !data?.billing) return null;
  const b = data.billing;
  const trial = computeTrialStatus(b.trial_ends_at);
  const isPaid = ["active", "trialing"].includes(b.status) && !!b.stripe_subscription_id;

  // Nothing useful to say
  if (isPaid && !b.cancel_at_period_end && b.status === "active") return null;

  const showManage = !!b.stripe_customer_id;
  let message = "";
  if (trial.active) {
    message = `Trial: ${trial.daysRemaining} day${trial.daysRemaining === 1 ? "" : "s"} remaining`;
  } else if (b.status === "past_due") {
    message = "Payment past due — update billing to keep your team active.";
  } else if (b.status === "canceled" || b.status === "trial") {
    message = "No active subscription. Pick a plan to continue after your trial.";
  } else {
    message = `Billing status: ${statusLabel(b.status)}`;
  }

  return (
    <div className="editorial-tile p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <CreditCard className="w-4 h-4 text-primary" />
        <span className="text-sm">{message}</span>
      </div>
      <div className="flex items-center gap-2">
        {showManage && (
          <Link
            to="/billing"
            className="border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] hover:border-primary transition-colors"
          >
            Manage
          </Link>
        )}
        <Link
          to="/billing"
          className="bg-primary text-primary-foreground px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] hover:brightness-110 transition-all"
        >
          Choose plan
        </Link>
      </div>
    </div>
  );
}
