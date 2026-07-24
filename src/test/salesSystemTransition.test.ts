import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import {
  SALES_SYSTEM_REGISTRY,
  normalizeSalesSystem,
  hasInAppTelephony,
} from "@/lib/salesSystem";
import { isSystemsStepComplete } from "@/lib/workspaceSetup";

// -----------------------------------------------------------------------------
// Neutral provider registry supports the transition
// -----------------------------------------------------------------------------
describe("sales system registry", () => {
  it("registers dialer_io, manual, gohighlevel, and legacy_aloware", () => {
    const ids = Object.keys(SALES_SYSTEM_REGISTRY).sort();
    expect(ids).toEqual(
      ["dialer_io", "gohighlevel", "legacy_aloware", "manual"].sort(),
    );
  });

  it("degrades unknown or legacy provider strings safely", () => {
    expect(normalizeSalesSystem("aloware")).toBe("legacy_aloware");
    expect(normalizeSalesSystem(null)).toBe("manual");
    expect(normalizeSalesSystem("something-else")).toBe("manual");
  });

  it("does not advertise in-app telephony for dialer_io or legacy_aloware", () => {
    expect(hasInAppTelephony("dialer_io")).toBe(false);
    expect(hasInAppTelephony("legacy_aloware")).toBe(false);
    expect(hasInAppTelephony("manual")).toBe(false);
  });

  it("allows dialer_io as a completed systems-step choice", () => {
    expect(
      isSystemsStepComplete({ crm_provider: "dialer_io" } as any),
    ).toBe(true);
    expect(
      isSystemsStepComplete({ crm_provider: "manual" } as any),
    ).toBe(true);
  });
});

// -----------------------------------------------------------------------------
// Static scan: no customer-facing Aloware surfaces
// -----------------------------------------------------------------------------
const CLIENT_ROOTS = ["src/pages", "src/components", "src/contexts", "src/hooks"];
const IGNORE_FILES = new Set([
  // dormant legacy code intentionally preserved for rollback / history
  "src/hooks/useAlowareConnection.ts",
  "src/hooks/useAlowareLead.ts",
  "src/hooks/useAlowareIntegration.ts",
  "src/hooks/useContactLookup.ts",
  "src/components/settings/AlowareSyncPanel.tsx",
  "src/components/settings/AlowareCompanyConnection.tsx",
  "src/components/settings/AlowareWebhookSetup.tsx",
  "src/components/settings/AlowareTeamConfig.tsx",
]);

function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

function collect(): string[] {
  const files: string[] = [];
  for (const root of CLIENT_ROOTS) {
    try {
      walk(root, files);
    } catch {
      /* missing dir – ignore */
    }
  }
  return files.filter((f) => !IGNORE_FILES.has(f.replace(/\\/g, "/")));
}

describe("Aloware customer surfaces are retired", () => {
  const files = collect();

  it("no live component/page/context imports an Aloware hook", () => {
    const bad: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      if (/from\s+['"]@?\/?hooks\/useAloware\w+['"]/.test(src)) bad.push(f);
    }
    expect(bad, `Aloware hook imports leaked: ${bad.join(", ")}`).toEqual([]);
  });

  it("no live client code invokes an Aloware edge function", () => {
    const bad: { file: string; match: string }[] = [];
    const pattern = /functions\.invoke\(\s*['"][^'"]*aloware[^'"]*['"]/i;
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const m = src.match(pattern);
      if (m) bad.push({ file: f, match: m[0] });
    }
    expect(
      bad,
      `Aloware edge invocations still present: ${JSON.stringify(bad)}`,
    ).toEqual([]);
  });

  it("no visible Aloware brand copy in pages/components", () => {
    const bad: { file: string; line: string }[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      for (const line of src.split("\n")) {
        // allow the word inside comments, imports of legacy types, or the
        // AlowareContact TS type name (used as an opaque shape only)
        if (!/aloware/i.test(line)) continue;
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
        if (/AlowareContact/.test(line)) continue;
        // legacy DB column names and enum ids are internal identifiers, not UI copy
        if (/aloware_user_id|legacy_aloware/.test(line)) continue;
        bad.push({ file: f, line: trimmed });
      }
    }
    expect(
      bad,
      `Aloware brand copy still visible: ${JSON.stringify(bad, null, 2)}`,
    ).toEqual([]);
  });
});
