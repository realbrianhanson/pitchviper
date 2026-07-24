// Manager-only Stripe seat update. Never trusts client-provided price/item/customer IDs.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { corsHeadersFor, jsonResponse } from "../_shared/billing.ts";

const MAX_SEATS = 500;
const MIN_SEATS = 5;

serve(async (req) => {
  const cors = corsHeadersFor(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, { status: 405 }, cors);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return jsonResponse({ error: "unauthorized" }, { status: 401 }, cors);
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData.user) return jsonResponse({ error: "unauthorized" }, { status: 401 }, cors);
    const userId = userData.user.id;

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
    const desiredRaw = Number(body.seats);
    if (!Number.isFinite(desiredRaw) || !Number.isInteger(desiredRaw)) {
      return jsonResponse({ error: "invalid_body" }, { status: 400 }, cors);
    }
    const desired = Math.max(MIN_SEATS, Math.min(MAX_SEATS, desiredRaw));

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
      .select("stripe_customer_id, stripe_subscription_id, status, seat_limit")
      .eq("team_id", teamId)
      .maybeSingle();

    if (!billing?.stripe_customer_id || !billing?.stripe_subscription_id) {
      return jsonResponse({ error: "no_subscription" }, { status: 409 }, cors);
    }
    if (!["active", "trialing", "past_due"].includes(String(billing.status ?? ""))) {
      return jsonResponse({ error: "subscription_inactive" }, { status: 409 }, cors);
    }

    // Cannot reduce below current used seats
    const { count: usedSeats } = await service
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId);
    const used = usedSeats ?? 0;
    if (desired < used) {
      return jsonResponse({ error: "seats_below_used", used }, { status: 409 }, cors);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return jsonResponse({ error: "billing_not_configured" }, { status: 503 }, cors);
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Fetch subscription — trust only the server-known ID from team_billing
    const sub = await stripe.subscriptions.retrieve(billing.stripe_subscription_id);
    const item = sub.items?.data?.[0];
    if (!item) return jsonResponse({ error: "subscription_item_missing" }, { status: 500 }, cors);

    if ((item.quantity ?? 0) === desired) {
      // Idempotent no-op sync
      await service
        .from("team_billing")
        .update({ seat_limit: desired, subscription_quantity: desired, updated_at: new Date().toISOString() })
        .eq("team_id", teamId);
      return jsonResponse({ ok: true, seats: desired, changed: false }, { status: 200 }, cors);
    }

    const updated = await stripe.subscriptions.update(billing.stripe_subscription_id, {
      items: [{ id: item.id, quantity: desired }],
      proration_behavior: "create_prorations",
    });

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
