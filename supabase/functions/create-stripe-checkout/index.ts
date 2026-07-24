// Creates a Stripe-hosted Checkout Session for the authenticated manager's team.
// Never trusts client input for team, seat count, or price.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import {
  billableSeats,
  resolvePriceId,
  corsHeadersFor,
  jsonResponse,
  appUrl,
} from "../_shared/billing.ts";

const MANAGEMENT_ROLES = ["owner", "admin", "manager"];
// Bucket concurrent identical checkout attempts within this window.
const CHECKOUT_BUCKET_SECONDS = 300;

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

    const rl = await enforceRateLimit(userId, "create-stripe-checkout", {
      serviceClient: service,
      perMinute: 6,
      perDay: 60,
    });
    if (!rl.allowed) return rl.response!;

    let body: { plan?: unknown; interval?: unknown };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_body" }, { status: 400 }, cors);
    }
    const plan = body.plan;
    const interval = body.interval;
    if (plan !== "starter" && plan !== "growth") {
      return jsonResponse({ error: "invalid_plan" }, { status: 400 }, cors);
    }
    if (interval !== "monthly" && interval !== "annual") {
      return jsonResponse({ error: "invalid_interval" }, { status: 400 }, cors);
    }

    const { data: roleRow, error: roleErr } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (roleErr) {
      console.error("checkout role lookup failed", roleErr.message);
      return jsonResponse({ error: "internal_error" }, { status: 500 }, cors);
    }
    const roles = (roleRow ?? []).map((r) => r.role as string);
    if (!roles.some((r) => MANAGEMENT_ROLES.includes(r))) {
      return jsonResponse({ error: "forbidden" }, { status: 403 }, cors);
    }

    const { data: profile, error: profErr } = await service
      .from("profiles")
      .select("team_id, email, full_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (profErr) {
      console.error("checkout profile lookup failed", profErr.message);
      return jsonResponse({ error: "internal_error" }, { status: 500 }, cors);
    }
    const teamId = profile?.team_id;
    if (!teamId) return jsonResponse({ error: "no_team" }, { status: 400 }, cors);

    const { count: memberCount, error: countErr } = await service
      .from("profiles")
      .select("user_id", { count: "exact", head: true })
      .eq("team_id", teamId);
    if (countErr) {
      console.error("checkout seat count failed", countErr.message);
      return jsonResponse({ error: "internal_error" }, { status: 500 }, cors);
    }
    const quantity = billableSeats(memberCount ?? 0);

    const priceId = resolvePriceId(plan, interval);
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const successUrl = appUrl("/billing?status=success&session_id={CHECKOUT_SESSION_ID}");
    const cancelUrl = appUrl("/billing?status=canceled");
    if (!priceId || !stripeKey || !successUrl || !cancelUrl) {
      return jsonResponse({ error: "billing_not_configured" }, { status: 503 }, cors);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });

    const { data: billing, error: billErr } = await service
      .from("team_billing")
      .select("stripe_customer_id, stripe_subscription_id, status, trial_ends_at")
      .eq("team_id", teamId)
      .maybeSingle();
    if (billErr) {
      console.error("checkout billing lookup failed", billErr.message);
      return jsonResponse({ error: "internal_error" }, { status: 500 }, cors);
    }

    if (
      billing?.stripe_subscription_id &&
      billing.status &&
      ["active", "trialing", "past_due"].includes(billing.status)
    ) {
      return jsonResponse({ error: "use_billing_portal" }, { status: 409 }, cors);
    }

    // Find or create a Stripe customer for the team, idempotently.
    let customerId = billing?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          email: profile?.email ?? userData.user.email ?? undefined,
          name: profile?.full_name ?? undefined,
          metadata: { team_id: teamId },
        },
        { idempotencyKey: `team-customer:${teamId}` },
      );
      customerId = customer.id;
      // Ensure the row exists and the customer id persists before Checkout.
      const { error: upsertErr } = await service
        .from("team_billing")
        .upsert(
          { team_id: teamId, stripe_customer_id: customerId },
          { onConflict: "team_id" },
        );
      if (upsertErr) {
        console.error("checkout customer persist failed", upsertErr.message);
        return jsonResponse({ error: "internal_error" }, { status: 500 }, cors);
      }
      // Verify the row now carries this customer id.
      const { data: verify, error: verifyErr } = await service
        .from("team_billing")
        .select("stripe_customer_id")
        .eq("team_id", teamId)
        .maybeSingle();
      if (verifyErr || verify?.stripe_customer_id !== customerId) {
        console.error("checkout customer verify failed");
        return jsonResponse({ error: "internal_error" }, { status: 500 }, cors);
      }
    }

    // Preserve remaining trial if meaningful (>=1 day).
    let trialEnd: number | undefined = undefined;
    if (billing?.trial_ends_at) {
      const endsAtMs = new Date(billing.trial_ends_at).getTime();
      if (!Number.isNaN(endsAtMs)) {
        const remainingDays = Math.floor((endsAtMs - Date.now()) / (1000 * 60 * 60 * 24));
        if (remainingDays >= 1) trialEnd = Math.floor(endsAtMs / 1000);
      }
    }

    // Short bounded time bucket → concurrent/repeated clicks return the same
    // session, but a canceled attempt can be retried after the bucket rolls.
    const bucket = Math.floor(Date.now() / (CHECKOUT_BUCKET_SECONDS * 1000));
    const checkoutIdempotencyKey =
      `checkout:${teamId}:${plan}:${interval}:${quantity}:${bucket}`;

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity }],
        client_reference_id: teamId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
        metadata: {
          team_id: teamId,
          plan,
          interval,
          seats: String(quantity),
          initiated_by: userId,
        },
        subscription_data: {
          metadata: {
            team_id: teamId,
            plan,
            interval,
            seats: String(quantity),
          },
          ...(trialEnd ? { trial_end: trialEnd } : {}),
        },
      },
      { idempotencyKey: checkoutIdempotencyKey },
    );

    if (!session.url) return jsonResponse({ error: "checkout_failed" }, { status: 502 }, cors);
    return jsonResponse({ url: session.url, session_id: session.id }, { status: 200 }, cors);
  } catch (err) {
    console.error("create-stripe-checkout error", (err as Error).message);
    return jsonResponse({ error: "internal_error" }, { status: 500 }, cors);
  }
});
