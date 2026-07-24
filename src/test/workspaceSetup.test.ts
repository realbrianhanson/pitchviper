import { describe, it, expect } from "vitest";
import {
  computeSetupProgress,
  computeSetupSteps,
  isCompanyStepValid,
  isTargetsStepValid,
  isSystemsStepComplete,
  isTeamStepComplete,
  type WorkspaceSetupInput,
} from "@/lib/workspaceSetup";

const baseInput: WorkspaceSetupInput = {
  company_name: "",
  product_description: "",
  daily_calls_target: 0,
  daily_appointments_target: 0,
  monthly_revenue_target: 0,
  crm_provider: "none",
  crm_connected_at: null,
  first_sync_at: null,
  setup_completed_at: null,
  setup_state: {},
  team_member_count: 1,
  mapped_rep_count: 0,
};

describe("workspaceSetup helpers", () => {
  it("company step requires name and meaningful product description", () => {
    expect(isCompanyStepValid({ company_name: "Acme", product_description: "short" })).toBe(false);
    expect(isCompanyStepValid({ company_name: "Acme", product_description: "A B2B outbound sales platform for closers" })).toBe(true);
  });

  it("targets step requires positive numbers on all three targets", () => {
    expect(isTargetsStepValid({ daily_calls_target: 0, daily_appointments_target: 3, monthly_revenue_target: 100 })).toBe(false);
    expect(isTargetsStepValid({ daily_calls_target: 50, daily_appointments_target: 3, monthly_revenue_target: 100000 })).toBe(true);
  });

  it("team step completes when explicitly reviewed, deferred, or team has multiple members", () => {
    expect(isTeamStepComplete({ team_member_count: 1, setup_state: {} })).toBe(false);
    expect(isTeamStepComplete({ team_member_count: 1, setup_state: { team_reviewed: true } })).toBe(true);
    expect(isTeamStepComplete({ team_member_count: 1, setup_state: { team_deferred: true } })).toBe(true);
    expect(isTeamStepComplete({ team_member_count: 3, setup_state: {} })).toBe(true);
  });

  it("systems step completes for connected CRM, reviewed manual, or explicit defer", () => {
    expect(isSystemsStepComplete({ crm_provider: "aloware", crm_connected_at: null, first_sync_at: null, setup_state: {} })).toBe(false);
    expect(isSystemsStepComplete({ crm_provider: "aloware", crm_connected_at: "2026-01-01", first_sync_at: null, setup_state: {} })).toBe(true);
    expect(isSystemsStepComplete({ crm_provider: "manual", crm_connected_at: null, first_sync_at: null, setup_state: { systems_reviewed: true } })).toBe(true);
    expect(isSystemsStepComplete({ crm_provider: "none", crm_connected_at: null, first_sync_at: null, setup_state: { systems_deferred: true } })).toBe(true);
  });

  it("progress reflects only completed steps and gates completion on company + targets", () => {
    const empty = computeSetupProgress(baseInput);
    expect(empty.percent).toBe(0);
    expect(empty.canComplete).toBe(false);
    expect(empty.nextStep).toBe("company");

    const partial = computeSetupProgress({
      ...baseInput,
      company_name: "Acme",
      product_description: "A B2B outbound sales platform for closers",
      daily_calls_target: 50,
      daily_appointments_target: 3,
      monthly_revenue_target: 100000,
      setup_state: { team_deferred: true, systems_deferred: true },
    });
    expect(partial.percent).toBe(100);
    expect(partial.canComplete).toBe(true);
    expect(partial.nextStep).toBe(null);
  });

  it("computeSetupSteps returns four steps in wizard order", () => {
    const ids = computeSetupSteps(baseInput).map((s) => s.id);
    expect(ids).toEqual(["company", "targets", "team", "systems"]);
  });
});
