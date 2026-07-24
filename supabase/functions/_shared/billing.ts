// Shared billing helpers for edge functions.
// Server-only; never imported from the client.

export const PLAN_INTERVAL_ENV: Record<string, string> = {
  "starter:monthly": "STRIPE_PRICE_STARTER_MONTHLY",
  "starter:annual": "STRIPE_PRICE_STARTER_ANNUAL",
  "growth:monthly": "STRIPE_PRICE_GROWTH_MONTHLY",
  "growth:annual": "STRIPE_PRICE_GROWTH_ANNUAL",
};

export const MIN_SEATS = 5;
export const MAX_SEATS = 500;

export function billableSeats(actual: number): number {
  const rounded = Math.max(0, Math.floor(actual));
  return Math.min(MAX_SEATS, Math.max(MIN_SEATS, rounded));
}

/** Resolve the configured Stripe price for a plan+interval, or null if unset. */
export function resolvePriceId(plan: string, interval: string): string | null {
  const envName = PLAN_INTERVAL_ENV[`${plan}:${interval}`];
  if (!envName) return null;
  const value = Deno.env.get(envName);
  return value && value.trim().length > 0 ? value.trim() : null;
}

export function priceToPlan(priceId: string): { plan: string; interval: string } | null {
  for (const [key, envName] of Object.entries(PLAN_INTERVAL_ENV)) {
    if (Deno.env.get(envName) === priceId) {
      const [plan, interval] = key.split(":");
      return { plan, interval };
    }
  }
  return null;
}

export function corsHeadersFor(origin: string | null): Record<string, string> {
  const publicUrl = (Deno.env.get("PUBLIC_APP_URL") ?? "").replace(/\/$/, "");
  const extra = (Deno.env.get("BILLING_EXTRA_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = new Set<string>([publicUrl, ...extra].filter(Boolean));
  const allowOrigin = origin && allowed.has(origin) ? origin : publicUrl || "";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function jsonResponse(body: unknown, init: ResponseInit, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

/** Build success/cancel URLs strictly from PUBLIC_APP_URL. */
export function appUrl(path: string): string | null {
  const base = (Deno.env.get("PUBLIC_APP_URL") ?? "").replace(/\/$/, "");
  if (!base) return null;
  try {
    const u = new URL(path, base + "/");
    if (u.protocol !== "https:" && !base.startsWith("http://localhost")) return null;
    return u.toString();
  } catch {
    return null;
  }
}
