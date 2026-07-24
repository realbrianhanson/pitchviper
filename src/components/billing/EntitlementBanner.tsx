import { Link } from "react-router-dom";
import { AlertCircle, Clock } from "lucide-react";
import { useEntitlement, trialDaysRemaining } from "@/hooks/useEntitlement";

/** Subtle top-of-app banner surfaced by AppLayout. */
export function EntitlementBanner() {
  const { data: ent } = useEntitlement();
  if (!ent) return null;

  if (ent.reason === "past_due_grace") {
    return (
      <Banner tone="warn" icon={<AlertCircle className="w-4 h-4 shrink-0" />}>
        <span>
          Payment failed — access continues briefly while we retry.{" "}
          {ent.can_manage ? (
            <Link to="/billing" className="underline hover:text-foreground">
              Update billing
            </Link>
          ) : (
            "Ask your manager to update billing."
          )}
        </span>
      </Banner>
    );
  }

  const days = trialDaysRemaining(ent);
  if (ent.reason === "trial" && days > 0 && days <= 5) {
    return (
      <Banner tone="info" icon={<Clock className="w-4 h-4 shrink-0 text-primary" />}>
        <span>
          {days} {days === 1 ? "day" : "days"} left on your trial.{" "}
          {ent.can_manage ? (
            <Link to="/billing" className="underline hover:text-foreground">
              Choose a plan
            </Link>
          ) : (
            "Ask your manager to choose a plan."
          )}
        </span>
      </Banner>
    );
  }

  if (ent.reason === "cancel_at_period_end" && ent.current_period_end) {
    const ends = new Date(ent.current_period_end).toLocaleDateString();
    return (
      <Banner tone="info" icon={<Clock className="w-4 h-4 shrink-0 text-primary" />}>
        <span>
          Subscription ends {ends}.{" "}
          {ent.can_manage ? (
            <Link to="/billing" className="underline hover:text-foreground">
              Manage billing
            </Link>
          ) : null}
        </span>
      </Banner>
    );
  }

  return null;
}

function Banner({
  tone,
  icon,
  children,
}: {
  tone: "info" | "warn";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const border =
    tone === "warn" ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/30";
  return (
    <div
      className={`w-full border-b ${border} px-4 py-2 text-xs font-mono uppercase tracking-[0.12em]`}
    >
      <div className="mx-auto max-w-[1440px] flex items-center gap-2">
        {icon}
        <div className="normal-case tracking-normal font-body text-[13px] text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}
