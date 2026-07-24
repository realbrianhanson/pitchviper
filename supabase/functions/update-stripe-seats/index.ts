// Manager-only Stripe seat update.
// - Auth via shared authenticatePost (POST + JWT + service client)
// - Strict seat range [max(5, used), 500]
// - Refuses if subscription price isn't a known configured plan price
// - Deterministic idempotency key: seats:{subId}:{itemId}:{qty}
// - Verifies team_billing update actually affected 1 row
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { corsHeadersFor, jsonResponse, priceToPlan, MIN_SEATS, MAX_SEATS } from "../_shared/billing.ts";
import { authenticatePost } from "../_shared/edgeAuth.ts";

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
      .select("stripe_customer_id, stripe_subscription_id, status")
      .eq("team_id", teamId)
      .maybeSingle();

    if (!billing?.stripe_customer_id || !billing?.stripe_subscription_id) {
      return jsonResponse({ error: "no_subscription" }, { status: 409 }, cors);
    }
    if (!["active", "trialing", "past_due"].includes(String(billing.status ?? ""))) {
      return jsonResponse({ error: "subscription_inactive" }, { status: 409 }, cors);
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
    const desired = desiredRaw; // already validated within [minAllowed, MAX_SEATS]

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return jsonResponse({ error: "billing_not_configured" }, { status: 503 }, cors);
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Fetch subscription — trust only the server-known ID from team_billing
    const sub = await stripe.subscriptions.retrieve(billing.stripe_subscription_id);
    if (!["active", "trialing", "past_due"].includes(sub.status)) {
      return jsonResponse({ error: "subscription_inactive" }, { status: 409 }, cors);
    }

    const items = sub.items?.data ?? [];
    if (items.length !== 1) {
      // Multi-item subs aren't supported by our seat model.
      return jsonResponse({ error: "subscription_item_missing" }, { status: 500 }, cors);
    }
    const item = items[0];
    const priceId = typeof item.price?.id === "string" ? item.price.id : "";
    if (!priceId || !priceToPlan(priceId)) {
      // Subscription is priced against something we don't recognize. Refuse.
      return jsonResponse({ error: "invalid_plan" }, { status: 409 }, cors);
    }

    const currentQty = item.quantity ?? 0;

    if (currentQty === desired) {
      // Idempotent no-op: still sync local cache.
      const { count } = await service
        .from("team_billing")
        .update(
          { seat_limit: desired, subscription_quantity: desired, updated_at: new Date().toISOString() },
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

    const newQty = updated.items?.data?.[0]?.quantity ?? desired;
    const { error: upErr, count } = await service
      .from("team_billing")
      .update(
        {
          seat_limit: newQty,
          subscription_quantity: newQty,
          updated_at: new Date().toISOString(),
        },
        { count: "exact" },
      )
      .eq("team_id", teamId);
    if (upErr || (count ?? 0) === 0) {
      return jsonResponse({ error: "apply_failed" }, { status: 500 }, cors);
    }

    return jsonResponse({ ok: true, seats: newQty, changed: true }, { status: 200 }, cors);
  } catch (err) {
    console.error("update-stripe-seats error", (err as Error).message);
    return jsonResponse({ error: "internal_error" }, { status: 500 }, cors);
  }
});
