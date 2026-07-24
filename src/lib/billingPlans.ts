// Pure client-side billing model. No secrets, no network. Price IDs live only
// on the server; the client never sees them.

export type PlanId = "starter" | "growth";
export type BillingInterval = "monthly" | "annual";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  monthlyPerSeat: number; // USD per seat / month
  annualPerSeat: number; // USD per seat / year (already discounted, 2 months free)
  features: string[];
  recommended?: boolean;
}

export const MIN_SEATS = 5;
export const MAX_SEATS = 500;
export const TRIAL_DAYS = 14;

export const PLANS: readonly PlanDefinition[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For focused teams starting to instrument the sales floor.",
    monthlyPerSeat: 29,
    annualPerSeat: 290,
    features: [
      "Live call intelligence & pipeline",
      "Roleplay Arena & Objection Vault",
      "Team leaderboards & achievements",
      "Manager coaching console",
      "5-seat minimum",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "For managers running a real coaching operation.",
    monthlyPerSeat: 49,
    annualPerSeat: 490,
    recommended: true,
    features: [
      "Everything in Starter",
      "AI coaching insights & competitions",
      "Deal momentum + forecast signals",
      "Advanced daily challenges & gauntlet",
      "Priority in-product support",
    ],
  },
];

export function getPlan(id: PlanId): PlanDefinition {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown plan: ${id}`);
  return plan;
}

export function billableSeats(actualSeats: number): number {
  const rounded = Math.max(0, Math.floor(actualSeats));
  return Math.min(MAX_SEATS, Math.max(MIN_SEATS, rounded));
}

export function perSeatPrice(plan: PlanDefinition, interval: BillingInterval): number {
  return interval === "monthly" ? plan.monthlyPerSeat : plan.annualPerSeat;
}

export function planTotal(
  plan: PlanDefinition,
  interval: BillingInterval,
  actualSeats: number,
): number {
  return perSeatPrice(plan, interval) * billableSeats(actualSeats);
}

/** Amount saved per seat/year by choosing annual vs. 12 * monthly. */
export function annualSavingsPerSeat(plan: PlanDefinition): number {
  return plan.monthlyPerSeat * 12 - plan.annualPerSeat;
}

export interface TrialStatus {
  active: boolean;
  daysRemaining: number;
  endsAt: Date | null;
}

export function computeTrialStatus(
  trialEndsAt: string | null | undefined,
  now: Date = new Date(),
): TrialStatus {
  if (!trialEndsAt) return { active: false, daysRemaining: 0, endsAt: null };
  const endsAt = new Date(trialEndsAt);
  if (Number.isNaN(endsAt.getTime())) return { active: false, daysRemaining: 0, endsAt: null };
  const msLeft = endsAt.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  return { active: msLeft > 0, daysRemaining, endsAt };
}

const STATUS_LABELS: Record<string, string> = {
  trial: "Trial",
  trialing: "Trial",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
  incomplete: "Incomplete",
  incomplete_expired: "Expired",
  unpaid: "Unpaid",
  paused: "Paused",
};

export function statusLabel(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return STATUS_LABELS[status] ?? "Unknown";
}

const ALLOWED_PLANS: readonly PlanId[] = ["starter", "growth"];
const ALLOWED_INTERVALS: readonly BillingInterval[] = ["monthly", "annual"];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (ALLOWED_PLANS as readonly string[]).includes(value);
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return typeof value === "string" && (ALLOWED_INTERVALS as readonly string[]).includes(value);
}

const STRIPE_HOST_SUFFIXES = [".stripe.com", ".checkout.stripe.com", ".billing.stripe.com"];

/** Only accept short-lived Stripe-hosted URLs before navigating the browser. */
export function isSafeStripeUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "stripe.com" || host === "checkout.stripe.com" || host === "billing.stripe.com") {
      return true;
    }
    return STRIPE_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
  } catch {
    return false;
  }
}

export function formatUSD(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
