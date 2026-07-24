
-- =====================================================================
-- Per-tenant provider credentials backed by Supabase Vault.
-- Never store secrets in public columns; store only Vault UUID references
-- and safe status metadata. All RPCs are service_role only.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.team_provider_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  provider text NOT NULL,
  webhook_key uuid NOT NULL DEFAULT gen_random_uuid(),
  api_token_secret_id uuid,
  webhook_secret_id uuid,
  status text NOT NULL DEFAULT 'disconnected',
  last_verified_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_provider_integrations_provider_ck CHECK (provider IN ('aloware')),
  CONSTRAINT team_provider_integrations_status_ck CHECK (status IN ('disconnected','connected','error')),
  CONSTRAINT team_provider_integrations_team_provider_uk UNIQUE (team_id, provider),
  CONSTRAINT team_provider_integrations_webhook_key_uk UNIQUE (webhook_key)
);

-- Lock the table down. No anon, no authenticated. Service role only.
REVOKE ALL ON public.team_provider_integrations FROM PUBLIC;
REVOKE ALL ON public.team_provider_integrations FROM anon;
REVOKE ALL ON public.team_provider_integrations FROM authenticated;
GRANT ALL ON public.team_provider_integrations TO service_role;

ALTER TABLE public.team_provider_integrations ENABLE ROW LEVEL SECURITY;
-- No policies. Only service_role bypass reaches rows.

CREATE INDEX IF NOT EXISTS idx_tpi_team_provider
  ON public.team_provider_integrations(team_id, provider);
CREATE INDEX IF NOT EXISTS idx_tpi_webhook_key
  ON public.team_provider_integrations(webhook_key);

DROP TRIGGER IF EXISTS tpi_touch_updated_at ON public.team_provider_integrations;
CREATE TRIGGER tpi_touch_updated_at BEFORE UPDATE ON public.team_provider_integrations
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------
-- Internal helper: build stable secret name for vault. Contains only
-- provider + team UUID + kind. Never company name/email.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._svc_provider_secret_name(_provider text, _team_id uuid, _kind text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'integration/' || _provider || '/team/' || _team_id::text || '/' || _kind
$$;

REVOKE ALL ON FUNCTION public._svc_provider_secret_name(text, uuid, text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- Safe status readback. Service role only. Never returns secret material.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.svc_provider_integration_status(_team_id uuid, _provider text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_row public.team_provider_integrations;
BEGIN
  IF _team_id IS NULL OR _provider IS NULL THEN
    RAISE EXCEPTION 'invalid_args' USING ERRCODE = '22023';
  END IF;
  IF _provider NOT IN ('aloware') THEN
    RAISE EXCEPTION 'invalid_provider' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row FROM public.team_provider_integrations
   WHERE team_id = _team_id AND provider = _provider;
  IF NOT FOUND THEN
    -- Ensure a row with a webhook_key exists so the manager UI has a stable
    -- inbound URL even before a token is saved.
    INSERT INTO public.team_provider_integrations(team_id, provider, status)
    VALUES (_team_id, _provider, 'disconnected')
    ON CONFLICT (team_id, provider) DO NOTHING
    RETURNING * INTO v_row;
    IF NOT FOUND THEN
      SELECT * INTO v_row FROM public.team_provider_integrations
       WHERE team_id = _team_id AND provider = _provider;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'provider', v_row.provider,
    'status', v_row.status,
    'has_token', v_row.api_token_secret_id IS NOT NULL,
    'has_webhook_secret', v_row.webhook_secret_id IS NOT NULL,
    'webhook_key', v_row.webhook_key,
    'last_verified_at', v_row.last_verified_at
  );
END $fn$;

REVOKE ALL ON FUNCTION public.svc_provider_integration_status(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.svc_provider_integration_status(uuid, text) TO service_role;

-- ---------------------------------------------------------------------
-- Save / update the provider API token in Vault.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.svc_provider_integration_save_token(
  _team_id uuid,
  _provider text,
  _token text,
  _actor uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $fn$
DECLARE
  v_row public.team_provider_integrations;
  v_name text;
  v_secret_id uuid;
  v_token text := coalesce(_token, '');
BEGIN
  IF _team_id IS NULL OR _provider IS NULL THEN
    RAISE EXCEPTION 'invalid_args' USING ERRCODE = '22023';
  END IF;
  IF _provider NOT IN ('aloware') THEN
    RAISE EXCEPTION 'invalid_provider' USING ERRCODE = '22023';
  END IF;
  IF length(v_token) < 4 OR length(v_token) > 256 THEN
    RAISE EXCEPTION 'invalid_token' USING ERRCODE = '22023';
  END IF;

  v_name := public._svc_provider_secret_name(_provider, _team_id, 'api_token');

  SELECT * INTO v_row FROM public.team_provider_integrations
   WHERE team_id = _team_id AND provider = _provider FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.team_provider_integrations(team_id, provider, status, created_by, updated_by)
    VALUES (_team_id, _provider, 'disconnected', _actor, _actor)
    RETURNING * INTO v_row;
  END IF;

  IF v_row.api_token_secret_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_row.api_token_secret_id, v_token, v_name, v_name);
    v_secret_id := v_row.api_token_secret_id;
  ELSE
    v_secret_id := vault.create_secret(v_token, v_name, v_name);
  END IF;

  UPDATE public.team_provider_integrations
     SET api_token_secret_id = v_secret_id,
         updated_by = _actor,
         updated_at = now()
   WHERE id = v_row.id;

  RETURN jsonb_build_object('ok', true);
END $fn$;

REVOKE ALL ON FUNCTION public.svc_provider_integration_save_token(uuid, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.svc_provider_integration_save_token(uuid, text, text, uuid) TO service_role;

-- ---------------------------------------------------------------------
-- Retrieve decrypted secret (kind = 'api_token' | 'webhook_secret').
-- Service role only. Never call from the browser or SQL editor.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.svc_provider_integration_get_secret(
  _team_id uuid,
  _provider text,
  _kind text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $fn$
DECLARE
  v_row public.team_provider_integrations;
  v_secret_id uuid;
  v_secret text;
BEGIN
  IF _team_id IS NULL OR _provider IS NULL OR _kind IS NULL THEN
    RAISE EXCEPTION 'invalid_args' USING ERRCODE = '22023';
  END IF;
  IF _provider NOT IN ('aloware') THEN
    RAISE EXCEPTION 'invalid_provider' USING ERRCODE = '22023';
  END IF;
  IF _kind NOT IN ('api_token', 'webhook_secret') THEN
    RAISE EXCEPTION 'invalid_kind' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row FROM public.team_provider_integrations
   WHERE team_id = _team_id AND provider = _provider;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'integration_not_configured' USING ERRCODE = 'P0002';
  END IF;

  v_secret_id := CASE _kind
    WHEN 'api_token' THEN v_row.api_token_secret_id
    WHEN 'webhook_secret' THEN v_row.webhook_secret_id
  END;
  IF v_secret_id IS NULL THEN
    RAISE EXCEPTION 'integration_not_configured' USING ERRCODE = 'P0002';
  END IF;

  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets
   WHERE id = v_secret_id;
  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'integration_not_configured' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_secret;
END $fn$;

REVOKE ALL ON FUNCTION public.svc_provider_integration_get_secret(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.svc_provider_integration_get_secret(uuid, text, text) TO service_role;

-- ---------------------------------------------------------------------
-- Rotate the webhook secret. Generates 32 bytes server-side, stores in
-- Vault, returns plaintext exactly once to the calling edge function.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.svc_provider_integration_rotate_webhook_secret(
  _team_id uuid,
  _provider text,
  _actor uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $fn$
DECLARE
  v_row public.team_provider_integrations;
  v_name text;
  v_secret text;
  v_secret_id uuid;
BEGIN
  IF _team_id IS NULL OR _provider IS NULL THEN
    RAISE EXCEPTION 'invalid_args' USING ERRCODE = '22023';
  END IF;
  IF _provider NOT IN ('aloware') THEN
    RAISE EXCEPTION 'invalid_provider' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row FROM public.team_provider_integrations
   WHERE team_id = _team_id AND provider = _provider FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.team_provider_integrations(team_id, provider, status, created_by, updated_by)
    VALUES (_team_id, _provider, 'disconnected', _actor, _actor)
    RETURNING * INTO v_row;
  END IF;

  v_name := public._svc_provider_secret_name(_provider, _team_id, 'webhook_secret');
  v_secret := encode(gen_random_bytes(32), 'hex');  -- 64 hex chars

  IF v_row.webhook_secret_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_row.webhook_secret_id, v_secret, v_name, v_name);
    v_secret_id := v_row.webhook_secret_id;
  ELSE
    v_secret_id := vault.create_secret(v_secret, v_name, v_name);
  END IF;

  UPDATE public.team_provider_integrations
     SET webhook_secret_id = v_secret_id,
         updated_by = _actor,
         updated_at = now()
   WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'ok', true,
    'webhook_secret', v_secret,
    'webhook_key', v_row.webhook_key
  );
END $fn$;

REVOKE ALL ON FUNCTION public.svc_provider_integration_rotate_webhook_secret(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.svc_provider_integration_rotate_webhook_secret(uuid, text, uuid) TO service_role;

-- ---------------------------------------------------------------------
-- Mark verified / update status without exposing secret material.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.svc_provider_integration_mark_verified(
  _team_id uuid,
  _provider text,
  _status text DEFAULT 'connected'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF _team_id IS NULL OR _provider IS NULL THEN
    RAISE EXCEPTION 'invalid_args' USING ERRCODE = '22023';
  END IF;
  IF _provider NOT IN ('aloware') THEN
    RAISE EXCEPTION 'invalid_provider' USING ERRCODE = '22023';
  END IF;
  IF _status NOT IN ('disconnected', 'connected', 'error') THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.team_provider_integrations
     SET status = _status,
         last_verified_at = CASE WHEN _status = 'connected' THEN now() ELSE last_verified_at END,
         updated_at = now()
   WHERE team_id = _team_id AND provider = _provider;
END $fn$;

REVOKE ALL ON FUNCTION public.svc_provider_integration_mark_verified(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.svc_provider_integration_mark_verified(uuid, text, text) TO service_role;

-- ---------------------------------------------------------------------
-- Disconnect: delete Vault secrets + row. Best-effort with checked rows.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.svc_provider_integration_disconnect(
  _team_id uuid,
  _provider text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $fn$
DECLARE
  v_row public.team_provider_integrations;
  v_deleted int := 0;
BEGIN
  IF _team_id IS NULL OR _provider IS NULL THEN
    RAISE EXCEPTION 'invalid_args' USING ERRCODE = '22023';
  END IF;
  IF _provider NOT IN ('aloware') THEN
    RAISE EXCEPTION 'invalid_provider' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row FROM public.team_provider_integrations
   WHERE team_id = _team_id AND provider = _provider FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'existed', false);
  END IF;

  IF v_row.api_token_secret_id IS NOT NULL THEN
    BEGIN
      DELETE FROM vault.secrets WHERE id = v_row.api_token_secret_id;
    EXCEPTION WHEN others THEN NULL; END;
  END IF;
  IF v_row.webhook_secret_id IS NOT NULL THEN
    BEGIN
      DELETE FROM vault.secrets WHERE id = v_row.webhook_secret_id;
    EXCEPTION WHEN others THEN NULL; END;
  END IF;

  DELETE FROM public.team_provider_integrations WHERE id = v_row.id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object('ok', v_deleted = 1, 'existed', true);
END $fn$;

REVOKE ALL ON FUNCTION public.svc_provider_integration_disconnect(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.svc_provider_integration_disconnect(uuid, text) TO service_role;

-- ---------------------------------------------------------------------
-- Resolve a webhook_key back to (team_id, has_secret). Service only.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.svc_provider_integration_by_webhook_key(_webhook_key uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE v_row public.team_provider_integrations;
BEGIN
  IF _webhook_key IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO v_row FROM public.team_provider_integrations
   WHERE webhook_key = _webhook_key LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'team_id', v_row.team_id,
    'provider', v_row.provider,
    'has_webhook_secret', v_row.webhook_secret_id IS NOT NULL
  );
END $fn$;

REVOKE ALL ON FUNCTION public.svc_provider_integration_by_webhook_key(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.svc_provider_integration_by_webhook_key(uuid) TO service_role;

-- =====================================================================
-- GHL activity gating: block writes from expired teams (webhook uses
-- service_role, so it bypasses this trigger — the webhook function
-- itself now checks entitlement per mapped team_id before writing).
-- =====================================================================
DROP TRIGGER IF EXISTS trg_ghl_activities_active_gate ON public.ghl_activities;
CREATE TRIGGER trg_ghl_activities_active_gate
BEFORE INSERT OR UPDATE ON public.ghl_activities
FOR EACH ROW EXECUTE FUNCTION public.enforce_active_entitlement();
