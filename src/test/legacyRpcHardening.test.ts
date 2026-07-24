import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("supabase/migrations/20260724041244_fda7b1ca-0c38-478d-92ff-be9dec42e210.sql"),
  "utf-8"
);

const READ_ONLY_HELPERS = [
  "get_user_role",
  "get_user_team_id",
  "has_role",
  "has_management_role",
  "calculate_streak",
];

const MUTATING_HELPERS = [
  "get_or_create_daily_stats",
  "get_or_create_user_status",
  "update_user_status",
  "log_activity",
];

describe("legacy user-scoped RPC hardening migration", () => {
  it("redefines every listed RPC", () => {
    for (const fn of [...READ_ONLY_HELPERS, ...MUTATING_HELPERS, "log_team_audit_event"]) {
      expect(migration).toMatch(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${fn}\\b`));
    }
  });

  it("read-only helpers silently deny cross-user callers", () => {
    for (const fn of READ_ONLY_HELPERS) {
      const idx = migration.indexOf(`FUNCTION public.${fn}(`);
      expect(idx, `missing definition for ${fn}`).toBeGreaterThan(-1);
      const end = migration.indexOf("END $$;", idx);
      const body = migration.slice(idx, end);
      expect(body).toMatch(/auth\.uid\(\) IS NOT NULL AND auth\.uid\(\) <>/);
      expect(body).toMatch(/RETURN (NULL|false|0)/);
      expect(body).not.toMatch(/RAISE EXCEPTION 'forbidden'/);
    }
  });

  it("mutating helpers raise stable forbidden error on cross-user", () => {
    for (const fn of MUTATING_HELPERS) {
      const idx = migration.indexOf(`FUNCTION public.${fn}(`);
      expect(idx, `missing definition for ${fn}`).toBeGreaterThan(-1);
      const end = migration.indexOf("END $$;", idx);
      const body = migration.slice(idx, end);
      expect(body).toMatch(/auth\.uid\(\) IS NOT NULL AND auth\.uid\(\) <>/);
      expect(body).toMatch(/RAISE EXCEPTION 'forbidden'/);
    }
  });

  it("log_activity bounds metadata size and numeric casts", () => {
    const idx = migration.indexOf("FUNCTION public.log_activity(");
    const body = migration.slice(idx, migration.indexOf("END $$;", idx));
    expect(body).toMatch(/octet_length\(v_meta::text\) > 4096/);
    expect(body).toMatch(/GREATEST\(0, LEAST\(600,/); // duration cap
    expect(body).toMatch(/GREATEST\(0, LEAST\(10000000,/); // revenue cap
    expect(body).toMatch(/EXCEPTION WHEN others THEN v_duration := 0/);
    expect(body).toMatch(/EXCEPTION WHEN others THEN v_value := 0/);
  });

  it("update_user_status bounds call_started_at timestamp", () => {
    const idx = migration.indexOf("FUNCTION public.update_user_status(");
    const body = migration.slice(idx, migration.indexOf("END $$;", idx));
    expect(body).toMatch(/now\(\) - interval '24 hours'/);
    expect(body).toMatch(/now\(\) \+ interval '1 minute'/);
    expect(body).toMatch(/v_started := NULL/);
  });

  it("log_team_audit_event derives actor/team and bounds inputs without storing notes", () => {
    const idx = migration.indexOf("FUNCTION public.log_team_audit_event(");
    const body = migration.slice(idx, migration.indexOf("END $$;", idx));
    expect(body).toMatch(/get_user_team_id\(auth\.uid\(\)\)/);
    expect(body).toMatch(/length\(v_action\) > 80/);
    expect(body).toMatch(/length\(v_ttype\) > 60/);
    expect(body).toMatch(/length\(v_tid\) > 100/);
    expect(body).toMatch(/octet_length\(v_meta::text\) > 4096/);
    expect(body).not.toMatch(/\bnotes\b/i);
  });

  it("get_or_create_* helpers refuse to expose or create rows for others", () => {
    for (const fn of ["get_or_create_daily_stats", "get_or_create_user_status"]) {
      const idx = migration.indexOf(`FUNCTION public.${fn}(`);
      const body = migration.slice(idx, migration.indexOf("END $$;", idx));
      expect(body).toMatch(/RAISE EXCEPTION 'forbidden'/);
    }
  });
});

describe("anon privilege revocation", () => {
  it("revokes ALL privileges from anon on public tables, sequences, functions", () => {
    expect(migration).toMatch(/REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon/);
    expect(migration).toMatch(/REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon/);
    expect(migration).toMatch(/REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon/);
  });

  it("blocks future default grants to anon", () => {
    expect(migration).toMatch(/ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon/);
    expect(migration).toMatch(/ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon/);
    expect(migration).toMatch(/ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon/);
  });

  it("preserves service_role and authenticated privileges", () => {
    expect(migration).toMatch(/GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role/);
    expect(migration).toMatch(/GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated/);
  });

  it("does not touch storage.objects avatar policy", () => {
    expect(migration).not.toMatch(/storage\.objects/);
    expect(migration).not.toMatch(/avatars/);
  });

  it("does not grant anon any table or function DML", () => {
    expect(migration).not.toMatch(/GRANT [A-Z, ]+ ON [^;]* TO [^;]*\banon\b/);
  });
});

describe("service-role-only tables and safe view remain intact", () => {
  it("migration does not weaken edge_rate_limits, roleplay_analysis_claims, xp_awards", () => {
    for (const t of ["edge_rate_limits", "roleplay_analysis_claims", "xp_awards"]) {
      expect(migration).not.toMatch(new RegExp(`GRANT [^;]* ON public\\.${t} TO (anon|authenticated)`));
    }
  });

  it("migration does not weaken team_profiles_safe view", () => {
    expect(migration).not.toMatch(/team_profiles_safe/);
  });
});
