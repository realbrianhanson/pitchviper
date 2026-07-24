// Source-level assertions covering the per-tenant Aloware vault migration:
// - Vault-referenced schema stores only secret UUIDs, never plaintext
// - All Aloware caller functions resolve tokens via getTeamAlowareToken
//   and never read the legacy global ALOWARE_API_TOKEN env
// - Webhook receiver requires ?key= and per-team Vault secret; no global
//   fallback exists
// - manage-aloware-integration is manager-only and never returns secrets
//   inside its status payload
// - GHL webhook checks entitlement per resolved team
// - Rep-facing UI no longer instructs users to add ALOWARE_API_TOKEN
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const R = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

const ALOWARE_CALLERS = [
  "supabase/functions/verify-aloware-connection/index.ts",
  "supabase/functions/initiate-aloware-call/index.ts",
  "supabase/functions/send-aloware-sms/index.ts",
  "supabase/functions/create-aloware-lead/index.ts",
  "supabase/functions/lookup-aloware-contact/index.ts",
  "supabase/functions/add-to-aloware-powerdialer/index.ts",
  "supabase/functions/sync-aloware-data/index.ts",
];

describe("Vault-backed schema for team_provider_integrations", () => {
  const migrations = fs.readdirSync(path.join(process.cwd(), "supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .map((f) => R(path.join("supabase/migrations", f)))
    .join("\n\n");

  it("creates a public.team_provider_integrations table with only Vault UUID references", () => {
    expect(migrations).toMatch(/CREATE TABLE IF NOT EXISTS public\.team_provider_integrations/);
    expect(migrations).toMatch(/api_token_secret_id\s+uuid/);
    expect(migrations).toMatch(/webhook_secret_id\s+uuid/);
    expect(migrations).toMatch(/webhook_key\s+uuid/);
    // No plaintext / last4 columns.
    expect(migrations).not.toMatch(/team_provider_integrations[\s\S]{0,2000}?token\s+text/i);
    expect(migrations).not.toMatch(/team_provider_integrations[\s\S]{0,2000}?last4/i);
  });

  it("revokes all access from anon + authenticated and grants to service_role only", () => {
    expect(migrations).toMatch(/REVOKE ALL ON public\.team_provider_integrations FROM (?:PUBLIC|anon|authenticated)/);
    expect(migrations).toMatch(/GRANT ALL ON public\.team_provider_integrations TO service_role/);
    expect(migrations).toMatch(/ALTER TABLE public\.team_provider_integrations ENABLE ROW LEVEL SECURITY/);
  });

  it("defines vault-backed RPCs and revokes them from anon + authenticated", () => {
    for (const fn of [
      "svc_provider_integration_status",
      "svc_provider_integration_save_token",
      "svc_provider_integration_get_secret",
      "svc_provider_integration_rotate_webhook_secret",
      "svc_provider_integration_disconnect",
      "svc_provider_integration_by_webhook_key",
    ]) {
      expect(migrations).toContain(`FUNCTION public.${fn}`);
      expect(migrations).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}[^;]*FROM[^;]*anon`));
    }
  });

  it("uses vault.create_secret / vault.update_secret and stores UUID refs", () => {
    expect(migrations).toMatch(/vault\.create_secret\(/);
    expect(migrations).toMatch(/vault\.update_secret\(/);
    expect(migrations).toMatch(/vault\.decrypted_secrets/);
  });

  it("secret name is composed only from provider/team UUID/kind", () => {
    expect(migrations).toMatch(/integration\/' \|\| _provider \|\| '\/team\/' \|\| _team_id::text \|\| '\/' \|\| _kind/);
  });
});

describe("Aloware caller functions use per-team vault tokens", () => {
  for (const file of ALOWARE_CALLERS) {
    it(`${path.basename(path.dirname(file))} imports getTeamAlowareToken`, () => {
      const src = R(file);
      expect(src).toMatch(/getTeamAlowareToken/);
    });
    it(`${path.basename(path.dirname(file))} does not read legacy global ALOWARE_API_TOKEN env`, () => {
      const src = R(file);
      expect(src).not.toMatch(/Deno\.env\.get\(\s*["']ALOWARE_API_TOKEN["']\s*\)/);
    });
  }
});

describe("Aloware webhook receiver — tenant-scoped auth", () => {
  const src = R("supabase/functions/aloware-webhook-receiver/index.ts");
  it("resolves owning team from ?key= before parsing payload beyond bounded bytes", () => {
    expect(src).toMatch(/searchParams\.get\("key"\)/);
    expect(src).toMatch(/resolveWebhookKey/);
    // key resolution must appear before payload JSON parse
    const keyIdx = src.indexOf("resolveWebhookKey");
    const payloadIdx = src.indexOf("readBoundedJson");
    expect(keyIdx).toBeGreaterThan(-1);
    expect(payloadIdx).toBeGreaterThan(keyIdx);
  });
  it("has zero references to legacy global ALOWARE_WEBHOOK_SECRET or ALOWARE_API_TOKEN", () => {
    expect(src).not.toMatch(/ALOWARE_WEBHOOK_SECRET/);
    expect(src).not.toMatch(/ALOWARE_API_TOKEN/);
  });
  it("timing-safe verifies the team's vault secret via Bearer or X-Aloware-Signature", () => {
    const helper = R("supabase/functions/_shared/alowareIntegration.ts");
    expect(helper).toMatch(/verifyWebhookAuth/);
    expect(helper).toMatch(/Authorization/);
    expect(helper).toMatch(/X-Aloware-Signature/);
    // constant-time compare (hash-and-diff loop or subtle digest)
    expect(helper).toMatch(/crypto\.subtle\.digest\("SHA-256"/);
  });
  it("stable-accepted response for expired teams so provider does not retry-storm", () => {
    expect(src).toMatch(/ignored:\s*true/);
  });
});

describe("manage-aloware-integration — manager-only, no secret leaks", () => {
  const src = R("supabase/functions/manage-aloware-integration/index.ts");
  it("requires authenticatePost + starter entitlement + management role", () => {
    expect(src).toMatch(/authenticatePost\(req\)/);
    expect(src).toMatch(/requireTeamEntitlement/);
    expect(src).toMatch(/has_management_role/);
  });
  it("uses vault-backed RPCs only", () => {
    expect(src).toMatch(/svc_provider_integration_status/);
    expect(src).toMatch(/svc_provider_integration_save_token/);
    expect(src).toMatch(/svc_provider_integration_get_secret/);
    expect(src).toMatch(/svc_provider_integration_rotate_webhook_secret/);
    expect(src).toMatch(/svc_provider_integration_disconnect/);
  });
  it("verifies the token against Aloware BEFORE storing", () => {
    // save-token branch must call verifyAlowareToken before saveToken RPC
    const idxVerify = src.indexOf("verifyAlowareToken(token)");
    const idxSave = src.indexOf('"svc_provider_integration_save_token"');
    expect(idxVerify).toBeGreaterThan(-1);
    expect(idxSave).toBeGreaterThan(-1);
    expect(idxVerify).toBeLessThan(idxSave);
  });
  it("status response never contains raw secret material", () => {
    // status branch returns only { ok, status, webhook_url }.
    expect(src).toMatch(/action === "status"/);
    // Guard against accidental token leak in status payload.
    expect(src).not.toMatch(/token:\s*token/);
  });
  it("disconnect requires exact confirmation string", () => {
    expect(src).toMatch(/DISCONNECT_CONFIRM\s*=\s*"DISCONNECT"/);
    expect(src).toMatch(/confirmation_required/);
  });
  it("never logs exception substrings in catch", () => {
    expect(src).not.toMatch(/console\.error\(err\.message\)/);
    expect(src).not.toMatch(/error:\s*err\.message/);
  });
});

describe("GHL webhook enforces mapped-team entitlement", () => {
  const src = R("supabase/functions/ghl-webhook/index.ts");
  it("resolves matched user's team and checks entitlement before insert", () => {
    expect(src).toMatch(/checkTeamEntitlementByTeamId\(supabase,\s*mappedTeamId/);
    const entIdx = src.indexOf("checkTeamEntitlementByTeamId");
    const insertIdx = src.indexOf('.from("ghl_activities")');
    expect(entIdx).toBeGreaterThan(-1);
    expect(insertIdx).toBeGreaterThan(entIdx);
  });
  it("returns stable 200 ignored response for paused teams", () => {
    expect(src).toMatch(/ignored:\s*true/);
  });
});

describe("UI removes global-secret instructions and shows premium per-team UX", () => {
  const teamCfg = R("src/components/settings/AlowareTeamConfig.tsx");
  const webhook = R("src/components/settings/AlowareWebhookSetup.tsx");
  const company = R("src/components/settings/AlowareCompanyConnection.tsx");
  const rep = R("src/components/settings/AlowareConnectionCard.tsx");

  it("no UI file references ALOWARE_API_TOKEN as user-facing copy", () => {
    for (const src of [teamCfg, webhook, rep]) {
      // The company-connection file has a single comment mentioning it as
      // negative guidance; that's fine. Non-company files must not.
      expect(src).not.toMatch(/ALOWARE_API_TOKEN[^\n]{0,200}(Secrets|Cloud|Lovable)/i);
    }
  });

  it("no UI file references SalesFloor branding anymore", () => {
    for (const src of [teamCfg, webhook, rep, company]) {
      expect(src).not.toMatch(/SalesFloor/i);
    }
  });

  it("webhook setup shows the tenant URL from server, not a global URL", () => {
    // The webhook URL now comes from useAlowareIntegration status.
    expect(webhook).toMatch(/useAlowareIntegration/);
    expect(webhook).not.toMatch(/VITE_SUPABASE_URL[^`]*aloware-webhook-receiver/);
  });

  it("token input is password + autocomplete new-password + never rendered back", () => {
    expect(company).toMatch(/type="password"/);
    expect(company).toMatch(/autoComplete="new-password"/);
    // Nothing that would echo the token value into DOM.
    expect(company).not.toMatch(/status\.token/);
  });

  it("disconnect requires exact DISCONNECT string in dialog", () => {
    expect(company).toMatch(/confirmText === "DISCONNECT"/);
  });
});

describe("Shared helper never exposes global credentials", () => {
  const src = R("supabase/functions/_shared/alowareIntegration.ts");
  it("resolves tokens exclusively via svc_provider_integration_get_secret RPC", () => {
    expect(src).toMatch(/rpc\("svc_provider_integration_get_secret"/);
    expect(src).not.toMatch(/Deno\.env\.get\(\s*["']ALOWARE_[A-Z_]+["']\s*\)/);
  });
});

