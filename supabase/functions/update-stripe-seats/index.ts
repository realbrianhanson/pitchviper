// Manager-only Stripe seat update.
// - Auth via shared authenticatePost (POST + JWT + service client)
// - Strict seat range [max(5, used), 500]
// - Refuses if the stored subscription price isn't a known configured
//   plan+interval price for the row's plan/billing_interval
// - Rejects past_due (route users to the Billing Portal instead)
// - Locates exactly one subscription item whose price.id matches the stored
//   price; other add-on items may co-exist. Updates ONLY that seat item.
// - Deterministic idempotency key: seats:{subId}:{itemId}:{qty}
// - After Stripe update, verifies the returned subscription id, status, item
//   id, price id, and quantity all match the expected values before touching
//   the DB. Any mismatch → provider_mismatch and the DB is not updated.
// - Verifies team_billing row was updated (count: exact).
// - Only stable error codes are ever logged.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import {
  corsHeadersFor,
  jsonResponse,
  priceToPlan,
  resolvePriceId,
  MIN_SEATS,
  MAX_SEATS,
} from "../_shared/billing.ts";
import { authenticatePost } from "../_shared/edgeAuth.ts";

const ACTIVE_STATUSES = ["active", "trialing"] as const;
function isActiveStatus(s: unknown): boolean {
  return typeof s === "string" && (ACTIVE_STATUSES as readonly string[]).includes(s);
}

serve(async (req) => {
  const cors = corsHeadersFor(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const auth = await authenticatePost(req);
  if (!auth.ok) return auth.response;
  const { userId, serviceClient: service } = auth.ctx;

  try {
    const rl = await enforceRateLimit(userId, "update-stripe-seats", {
      serviceClient: service,
      perMinute: 3,
      perDay: 30,
    });
    if (!rl.allowed) return rl.response!;

    // Parse desired seats
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: "invalid_body" }, { status: 400 }, cors);
    }
    const desiredRaw = Number((body as { seats?: unknown }).seats);
    if (!Number.isFinite(desiredRaw) || !Number.isInteger(desiredRaw)) {
      return jsonResponse({ error: "invalid_body" }, { status: 400 }, cors);
    }

    // Management role required
    const { data: mgmt } = await service.rpc("has_management_role", { _user_id: userId });
    if (mgmt !== true) return jsonResponse({ error: "forbidden" }, { status: 403 }, cors);

    // Resolve team + billing row
    const { data: profile } = await service
      .from("profiles")
      .select("team_id")
      .eq("user_id", userId)
      .maybeSingle();
    const teamId = profile?.team_id;
    if (!teamId) return jsonResponse({ error: "no_team" }, { status: 400 }, cors);

    const { data: billing } = await service
      .from("team_billing")
      .select(
        "stripe_customer_id, stripe_subscription_id, status, stripe_price_id, plan, billing_interval",
      )
      .eq("team_id", teamId)
      .maybeSingle();

    if (!billing?.stripe_customer_id || !billing?.stripe_subscription_id) {
      return jsonResponse({ error: "no_subscription" }, { status: 409 }, cors);
    }
    if (!isActiveStatus(billing.status)) {
      // past_due, canceled, unpaid, incomplete → Portal is the recovery path.
      return jsonResponse({ error: "subscription_inactive" }, { status: 409 }, cors);
    }

    const storedPriceId =
      typeof billing.stripe_price_id === "string" ? billing.stripe_price_id.trim() : "";
    const storedPlan = typeof billing.plan === "string" ? billing.plan : "";
    const storedInterval =
      typeof billing.billing_interval === "string" ? billing.billing_interval : "";
    if (!storedPriceId || !storedPlan || !storedInterval) {
      return jsonResponse({ error: "invalid_plan" }, { status: 409 }, cors);
    }
    // Stored price must be a currently-configured known plan price AND match
    // the row's own plan + interval. Fail closed on any mismatch.
    const knownConfigured = resolvePriceId(storedPlan, storedInterval);
    const mapped = priceToPlan(storedPriceId);
    if (
      !knownConfigured ||
      knownConfigured !== storedPriceId ||
      !mapped ||
      mapped.plan !== storedPlan ||
      mapped.interval !== storedInterval
    ) {
      return jsonResponse({ error: "invalid_plan" }, { status: 409 }, cors);
    }

    // Cannot reduce below current used seats (effective usage includes pending invites)
    const { data: usageData } = await service.rpc("effective_seat_usage", { p_team_id: teamId });
    const used = Number(usageData ?? 0);
    const minAllowed = Math.max(MIN_SEATS, used);

    if (desiredRaw < minAllowed) {
      return jsonResponse(
        { error: "seats_below_used", used, min: minAllowed },
        { status: 409 },
        cors,
      );
    }
    if (desiredRaw > MAX_SEATS) {
      return jsonResponse(
        { error: "seats_above_max", max: MAX_SEATS },
        { status: 409 },
        cors,
      );
    }
    const desired = desiredRaw;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return jsonResponse({ error: "billing_not_configured" }, { status: 503 }, cors);
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Fetch subscription — trust only the server-known ID from team_billing
    const sub = await stripe.subscriptions.retrieve(billing.stripe_subscription_id);
    if (sub.id !== billing.stripe_subscription_id) {
      return jsonResponse({ error: "provider_mismatch" }, { status: 502 }, cors);
    }
    if (!isActiveStatus(sub.status)) {
      return jsonResponse({ error: "subscription_inactive" }, { status: 409 }, cors);
    }

    const allItems = sub.items?.data ?? [];
    // Match the seat item by stored price id. Other add-on items may co-exist,
    // but there must be exactly one seat item.
    const seatItems = allItems.filter(
      (i) => typeof i.price?.id === "string" && i.price.id === storedPriceId,
    );
    if (seatItems.length !== 1) {
      return jsonResponse({ error: "subscription_item_missing" }, { status: 500 }, cors);
    }
    const item = seatItems[0];
    const currentQty = item.quantity ?? 0;

    if (currentQty === desired) {
      // Idempotent no-op: still sync local cache.
      const { count } = await service
        .from("team_billing")
        .update(
          {
            seat_limit: desired,
            subscription_quantity: desired,
            updated_at: new Date().toISOString(),
          },
          { count: "exact" },
        )
        .eq("team_id", teamId);
      if ((count ?? 0) === 0) {
        return jsonResponse({ error: "apply_failed" }, { status: 500 }, cors);
      }
      return jsonResponse({ ok: true, seats: desired, changed: false }, { status: 200 }, cors);
    }

    // Deterministic idempotency key — same desired qty against same sub+item
    // is safe to retry, but a different qty won't collide.
    const idemKey = `seats:${billing.stripe_subscription_id}:${item.id}:${desired}`;

    const updated = await stripe.subscriptions.update(
      billing.stripe_subscription_id,
      {
        items: [{ id: item.id, quantity: desired }],
        proration_behavior: "create_prorations",
      },
      { idempotencyKey: idemKey },
    );

    // Verify the returned subscription strictly matches what we asked for.
    if (updated.id !== billing.stripe_subscription_id || !isActiveStatus(updated.status)) {
      return jsonResponse({ error: "provider_mismatch" }, { status: 502 }, cors);
    }
    const returnedSeatItems = (updated.items?.data ?? []).filter(
      (i) =>
        i.id === item.id &&
        typeof i.price?.id === "string" &&
        i.price.id === storedPriceId,
    );
    if (returnedSeatItems.length !== 1) {
      return jsonResponse({ error: "provider_mismatch" }, { status: 502 }, cors);
    }
    const returnedQty = returnedSeatItems[0].quantity ?? -1;
    if (returnedQty !== desired) {
      return jsonResponse({ error: "provider_mismatch" }, { status: 502 }, cors);
    }

    const { error: upErr, count } = await service
      .from("team_billing")
      .update(
        {
          seat_limit: desired,
          subscription_quantity: desired,
          updated_at: new Date().toISOString(),
        },
        { count: "exact" },
      )
      .eq("team_id", teamId);
    if (upErr || (count ?? 0) === 0) {
      return jsonResponse({ error: "apply_failed" }, { status: 500 }, cors);
    }

    return jsonResponse({ ok: true, seats: desired, changed: true }, { status: 200 }, cors);
  } catch {
    // Stable code only — never leak provider or exception detail.
    console.error(JSON.stringify({ fn: "update-stripe-seats", code: "internal_error" }));
    return jsonResponse({ error: "internal_error" }, { status: 500 }, cors);
  }
});
