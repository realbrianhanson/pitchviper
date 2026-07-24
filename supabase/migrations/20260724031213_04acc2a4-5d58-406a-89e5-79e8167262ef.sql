-- Atomic claim for Stripe webhook events: prevents concurrent duplicate processing.
-- Idempotent.

CREATE OR REPLACE FUNCTION public.claim_stripe_webhook_event(
  p_event_id   text,
  p_event_type text,
  p_object_id  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.stripe_webhook_events;
  v_stale_after interval := interval '5 minutes';
BEGIN
  IF p_event_id IS NULL OR length(trim(p_event_id)) = 0 THEN
    RAISE EXCEPTION 'event_id_required' USING ERRCODE = '22023';
  END IF;

  -- Fast path: first delivery. Atomic insert-or-nothing.
  INSERT INTO public.stripe_webhook_events(event_id, event_type, object_id, status, attempts)
  VALUES (p_event_id, p_event_type, p_object_id, 'processing', 1)
  ON CONFLICT (event_id) DO NOTHING
  RETURNING * INTO v_row;

  IF FOUND THEN
    RETURN jsonb_build_object('status','claimed','attempts',v_row.attempts);
  END IF;

  -- Existing row: lock it for the claim decision.
  SELECT * INTO v_row
  FROM public.stripe_webhook_events
  WHERE event_id = p_event_id
  FOR UPDATE;

  IF v_row.status IN ('completed','ignored') THEN
    RETURN jsonb_build_object('status', v_row.status, 'attempts', v_row.attempts);
  END IF;

  IF v_row.status = 'processing' THEN
    -- Another delivery holds the claim, unless it's stale.
    IF v_row.updated_at IS NULL OR v_row.updated_at >= now() - v_stale_after THEN
      RETURN jsonb_build_object('status','processing','attempts',v_row.attempts);
    END IF;
    UPDATE public.stripe_webhook_events
       SET attempts = v_row.attempts + 1,
           error = NULL,
           updated_at = now()
     WHERE event_id = p_event_id
     RETURNING * INTO v_row;
    RETURN jsonb_build_object('status','claimed','attempts',v_row.attempts);
  END IF;

  -- 'received' or 'failed' → reclaimable exactly once per caller.
  UPDATE public.stripe_webhook_events
     SET status = 'processing',
         attempts = v_row.attempts + 1,
         error = NULL,
         updated_at = now()
   WHERE event_id = p_event_id
   RETURNING * INTO v_row;

  RETURN jsonb_build_object('status','claimed','attempts',v_row.attempts);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_stripe_webhook_event(text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_stripe_webhook_event(text,text,text) FROM anon;
REVOKE ALL ON FUNCTION public.claim_stripe_webhook_event(text,text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_stripe_webhook_event(text,text,text) TO service_role;

-- Reassert table lockdown (idempotent, defense in depth).
REVOKE ALL ON public.stripe_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.stripe_webhook_events TO service_role;