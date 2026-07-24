// Stripe webhook: signed raw-body verification, atomic idempotent processing.
// verify_jwt = false (configured in supabase/config.toml).
// Only trusts Stripe-signed payloads; never trusts client input.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { priceToPlan } from "../_shared/billing.ts";

const HANDLED_TYPES = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

// deno-lint-ignore no-explicit-any
type Svc = any;

serve(async (req) => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    console.error("stripe-webhook: not configured");
    return new Response("not_configured", { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("missing_signature", { status: 400 });

  const rawBody = await req.text();

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (err) {
    console.error("stripe-webhook signature failure", (err as Error).message);
    return new Response("invalid_signature", { status: 400 });
  }

  const service: Svc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const objectId = ((event.data.object as { id?: string })?.id) ?? null;

  // Ignore unhandled event types via an atomic upsert; no processing needed.
  if (!HANDLED_TYPES.has(event.type)) {
    const { error } = await service.from("stripe_webhook_events").upsert(
      {
        event_id: event.id,
        event_type: event.type,
        object_id: objectId,
        status: "ignored",
        processed_at: new Date().toISOString(),
      },
      { onConflict: "event_id" },
    );
    if (error) {
      console.error("stripe-webhook ignored-upsert failed", error.message);
      return new Response("processing_error", { status: 500 });
    }
    return new Response("ok", { status: 200 });
  }

  // Atomic claim: at most one caller processes at a time.
  const { data: claim, error: claimErr } = await service.rpc("claim_stripe_webhook_event", {
    p_event_id: event.id,
    p_event_type: event.type,
    p_object_id: objectId,
  });
  if (claimErr) {
    console.error("stripe-webhook claim failed", claimErr.message);
    return new Response("processing_error", { status: 500 });
  }
  const claimStatus = (claim as { status?: string } | null)?.status;
  if (claimStatus === "completed" || claimStatus === "ignored") {
    return new Response("ok", { status: 200 });
  }
  if (claimStatus === "processing") {
    // Another delivery holds the claim; let Stripe retry later.
    return new Response("processing_in_flight", { status: 409 });
  }
  if (claimStatus !== "claimed") {
    console.error("stripe-webhook unexpected claim status", claimStatus);
    return new Response("processing_error", { status: 500 });
  }

  try {
    const result = await processEvent(event, stripe, service);
    if (result === "ignored") {
      const { error } = await service
        .from("stripe_webhook_events")
        .update({
          status: "ignored",
          processed_at: new Date().toISOString(),
          error: null,
        })
        .eq("event_id", event.id);
      if (error) throw new Error("ledger_update_failed");
      return new Response("ok", { status: 200 });
    }
    const { error: doneErr } = await service
      .from("stripe_webhook_events")
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
        error: null,
        team_id: result.teamId ?? null,
      })
      .eq("event_id", event.id);
    if (doneErr) throw new Error("ledger_update_failed");
    return new Response("ok", { status: 200 });
  } catch (err) {
    const code = normalizeFailureCode((err as Error).message);
    console.error("stripe-webhook processing failed", event.type, code);
    const { error: failErr } = await service
      .from("stripe_webhook_events")
      .update({ status: "failed", error: code })
      .eq("event_id", event.id);
    if (failErr) {
      console.error("stripe-webhook ledger fail-update failed", event.type);
    }
    return new Response("processing_error", { status: 500 });
  }
});

type ProcessResult = "ignored" | { teamId: string | null };

const FAILURE_CODES = new Set([
  "malformed_event",
  "unknown_price",
  "apply_failed",
  "ledger_update_failed",
  "stripe_lookup_failed",
]);
function normalizeFailureCode(msg: string): string {
  return FAILURE_CODES.has(msg) ? msg : "unknown_error";
}

async function processEvent(
  event: Stripe.Event,
  stripe: Stripe,
  service: Svc,
): Promise<ProcessResult> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const teamId =
      (session.metadata?.team_id as string | undefined) ??
      (session.client_reference_id as string | undefined) ??
      null;
    // Checkout without our team metadata is not one of ours: safe to ignore.
    if (!teamId) return "ignored";
    if (typeof session.subscription !== "string") {
      throw new Error("malformed_event");
    }
    let sub: Stripe.Subscription;
    try {
      sub = await stripe.subscriptions.retrieve(session.subscription);
    } catch {
      throw new Error("stripe_lookup_failed");
    }
    await applySubscription(service, teamId, sub);
    return { teamId };
  }

  const sub = event.data.object as Stripe.Subscription;
  let teamId = (sub.metadata?.team_id as string | undefined) ?? null;
  if (!teamId) {
    teamId = await resolveTeamFromCustomer(service, sub.customer as string);
  }
  // Unrelated subscription (no metadata, customer not in our billing table) → ignore.
  if (!teamId) return "ignored";

  if (event.type === "customer.subscription.deleted") {
    const { data: updated, error } = await service
      .from("team_billing")
      .update({
        status: "canceled",
        cancel_at_period_end: false,
        stripe_subscription_id: null,
        last_webhook_at: new Date().toISOString(),
      })
      .eq("team_id", teamId)
      .select("team_id");
    if (error) throw new Error("apply_failed");
    if (!updated || updated.length !== 1) throw new Error("apply_failed");
    return { teamId };
  }

  await applySubscription(service, teamId, sub);
  return { teamId };
}

async function resolveTeamFromCustomer(service: Svc, customerId: string): Promise<string | null> {
  if (!customerId) return null;
  const { data, error } = await service
    .from("team_billing")
    .select("team_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (error) throw new Error("apply_failed");
  return (data as { team_id?: string } | null)?.team_id ?? null;
}

async function applySubscription(service: Svc, teamId: string, sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const quantity = item?.quantity ?? null;
  const mapped = priceId ? priceToPlan(priceId) : null;

  // Fail closed for app subscriptions whose price we don't recognize.
  if (!priceId || !mapped || quantity == null) {
    throw new Error("unknown_price");
  }

  const patch: Record<string, unknown> = {
    stripe_subscription_id: sub.id,
    status: sub.status,
    plan: mapped.plan,
    billing_interval: mapped.interval,
    stripe_price_id: priceId,
    subscription_quantity: quantity,
    seat_limit: quantity,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
    last_webhook_at: new Date().toISOString(),
  };
  const { error } = await service.from("team_billing").update(patch).eq("team_id", teamId);
  if (error) throw new Error("apply_failed");
}
