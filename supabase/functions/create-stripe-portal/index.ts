// Creates a Stripe Customer Portal session for the authenticated manager's team.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { corsHeadersFor, jsonResponse, appUrl } from "../_shared/billing.ts";

const MANAGEMENT_ROLES = ["owner", "admin", "manager"];

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

    const rl = await enforceRateLimit(userId, "create-stripe-portal", {
      serviceClient: service,
      perMinute: 6,
      perDay: 60,
    });
    if (!rl.allowed) return rl.response!;

    const { data: roleRow } = await service.from("user_roles").select("role").eq("user_id", userId);
    const roles = (roleRow ?? []).map((r) => r.role as string);
    if (!roles.some((r) => MANAGEMENT_ROLES.includes(r))) {
      return jsonResponse({ error: "forbidden" }, { status: 403 }, cors);
    }
    const { data: profile } = await service
      .from("profiles")
      .select("team_id")
      .eq("user_id", userId)
      .maybeSingle();
    const teamId = profile?.team_id;
    if (!teamId) return jsonResponse({ error: "no_team" }, { status: 400 }, cors);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const returnUrl = appUrl("/billing");
    if (!stripeKey || !returnUrl) {
      return jsonResponse({ error: "billing_not_configured" }, { status: 503 }, cors);
    }

    const { data: billing } = await service
      .from("team_billing")
      .select("stripe_customer_id")
      .eq("team_id", teamId)
      .maybeSingle();
    if (!billing?.stripe_customer_id) {
      return jsonResponse({ error: "no_customer" }, { status: 409 }, cors);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
    const session = await stripe.billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      return_url: returnUrl,
    });
    return jsonResponse({ url: session.url }, { status: 200 }, cors);
  } catch (err) {
    console.error("create-stripe-portal error", err);
    return jsonResponse({ error: "internal_error" }, { status: 500 }, cors);
  }
});
