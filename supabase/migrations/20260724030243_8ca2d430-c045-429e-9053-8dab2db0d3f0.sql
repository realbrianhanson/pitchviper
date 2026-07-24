
-- Billing readiness: extend team_billing and add stripe_webhook_events
-- Idempotent

ALTER TABLE public.team_billing
  ADD COLUMN IF NOT EXISTS billing_interval TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS subscription_quantity INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_webhook_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_billing_billing_interval_chk'
  ) THEN
    ALTER TABLE public.team_billing
      ADD CONSTRAINT team_billing_billing_interval_chk
      CHECK (billing_interval IN ('monthly','annual'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_billing_status_chk'
  ) THEN
    ALTER TABLE public.team_billing
      ADD CONSTRAINT team_billing_status_chk
      CHECK (status IN ('trialing','trial','active','past_due','canceled','incomplete','incomplete_expired','unpaid','paused'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_billing_plan_chk'
  ) THEN
    ALTER TABLE public.team_billing
      ADD CONSTRAINT team_billing_plan_chk
      CHECK (plan IN ('trial','starter','growth','enterprise'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_billing_qty_chk'
  ) THEN
    ALTER TABLE public.team_billing
      ADD CONSTRAINT team_billing_qty_chk
      CHECK (subscription_quantity >= 1 AND subscription_quantity <= 10000);
  END IF;
END $$;

-- updated_at trigger (reuse handle_updated_at)
DROP TRIGGER IF EXISTS trg_team_billing_updated_at ON public.team_billing;
CREATE TRIGGER trg_team_billing_updated_at
  BEFORE UPDATE ON public.team_billing
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Stripe webhook events (idempotency ledger; no PII/payload storage)
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  object_id TEXT,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'received',
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stripe_webhook_events_status_chk'
  ) THEN
    ALTER TABLE public.stripe_webhook_events
      ADD CONSTRAINT stripe_webhook_events_status_chk
      CHECK (status IN ('received','processing','completed','failed','ignored'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type ON public.stripe_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status ON public.stripe_webhook_events(status);

REVOKE ALL ON public.stripe_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.stripe_webhook_events TO service_role;

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role only" ON public.stripe_webhook_events;
CREATE POLICY "service role only" ON public.stripe_webhook_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_stripe_webhook_events_updated_at ON public.stripe_webhook_events;
CREATE TRIGGER trg_stripe_webhook_events_updated_at
  BEFORE UPDATE ON public.stripe_webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
