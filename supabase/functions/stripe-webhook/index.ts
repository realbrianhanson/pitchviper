// Stripe webhook: signed raw-body verification, idempotent processing.
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

  // Raw body must be read before parsing.
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

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Idempotency: upsert event row. If already completed, ack immediately.
  const { data: existing } = await service
    .from("stripe_webhook_events")
    .select("status, attempts")
    .eq("event_id", event.id)
    .maybeSingle();

  if (existing?.status === "completed") return new Response("ok", { status: 200 });

  if (!HANDLED_TYPES.has(event.type)) {
    await service.from("stripe_webhook_events").upsert(
      {
        event_id: event.id,
        event_type: event.type,
        status: "ignored",
        processed_at: new Date().toISOString(),
      },
      { onConflict: "event_id" },
    );
    return new Response("ok", { status: 200 });
  }

  const objectId = ((event.data.object as { id?: string })?.id) ?? null;

  await service.from("stripe_webhook_events").upsert(
    {
      event_id: event.id,
      event_type: event.type,
      object_id: objectId,
      status: "processing",
      attempts: (existing?.attempts ?? 0) + 1,
    },
    { onConflict: "event_id" },
  );

  try {
    await processEvent(event, stripe, service);
    await service
      .from("stripe_webhook_events")
      .update({ status: "completed", processed_at: new Date().toISOString(), error: null })
      .eq("event_id", event.id);
    return new Response("ok", { status: 200 });
  } catch (err) {
    const message = (err as Error).message?.slice(0, 500) ?? "unknown";
    console.error("stripe-webhook processing failed", event.type, message);
    await service
      .from("stripe_webhook_events")
      .update({ status: "failed", error: message })
      .eq("event_id", event.id);
    // Return 500 so Stripe retries.
    return new Response("processing_error", { status: 500 });
  }
});

async function processEvent(
  event: Stripe.Event,
  stripe: Stripe,
  // deno-lint-ignore no-explicit-any
  service: any,
) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const teamId =
      (session.metadata?.team_id as string | undefined) ??
      (session.client_reference_id as string | undefined) ??
      null;
    if (!teamId || typeof session.subscription !== "string") return;
    const sub = await stripe.subscriptions.retrieve(session.subscription);
    await applySubscription(service, teamId, sub);
    return;
  }
  const sub = event.data.object as Stripe.Subscription;
  const teamId =
    (sub.metadata?.team_id as string | undefined) ??
    (await resolveTeamFromCustomer(service, sub.customer as string));
  if (!teamId) return;

  if (event.type === "customer.subscription.deleted") {
    await service
      .from("team_billing")
      .update({
        status: "canceled",
        cancel_at_period_end: false,
        stripe_subscription_id: null,
        last_webhook_at: new Date().toISOString(),
      })
      .eq("team_id", teamId);
    await service
      .from("stripe_webhook_events")
      .update({ team_id: teamId })
      .eq("event_id", event.id);
    return;
  }

  await applySubscription(service, teamId, sub);
  await service.from("stripe_webhook_events").update({ team_id: teamId }).eq("event_id", event.id);
}

// deno-lint-ignore no-explicit-any
async function resolveTeamFromCustomer(service: any, customerId: string): Promise<string | null> {
  if (!customerId) return null;
  const { data } = await service
    .from("team_billing")
    .select("team_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.team_id ?? null;
}

// deno-lint-ignore no-explicit-any
async function applySubscription(service: any, teamId: string, sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const quantity = item?.quantity ?? 5;
  const mapped = priceId ? priceToPlan(priceId) : null;

  const patch: Record<string, unknown> = {
    stripe_subscription_id: sub.id,
    status: sub.status,
    stripe_price_id: priceId,
    subscription_quantity: quantity,
    seat_limit: quantity,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
    last_webhook_at: new Date().toISOString(),
  };
  if (mapped) {
    patch.plan = mapped.plan;
    patch.billing_interval = mapped.interval;
  }
  await service.from("team_billing").update(patch).eq("team_id", teamId);
}
