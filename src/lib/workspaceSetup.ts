/**
 * Pure helpers for the guided workspace-setup wizard.
 *
 * Kept free of React/Supabase so they can be unit-tested and reused across
 * the hook, the wizard page, and the manager-dashboard checklist card.
 */

export type CrmProvider = "none" | "aloware" | "gohighlevel" | "manual" | "dialer_io" | "legacy_aloware";

export interface WorkspaceSetupState {
  /** Manager explicitly reviewed the Team step (even if no invites sent). */
  team_reviewed?: boolean;
  /** Manager chose to defer inviting teammates for now. */
  team_deferred?: boolean;
  /** Manager explicitly reviewed the Systems step. */
  systems_reviewed?: boolean;
  /** Manager chose to defer connecting an integration for now. */
  systems_deferred?: boolean;
}

export interface WorkspaceSetupInput {
  company_name: string | null | undefined;
  product_description: string | null | undefined;
  industry?: string | null;
  target_audience?: string | null;
  brand_color?: string | null;
  logo_url?: string | null;
  timezone?: string | null;
  daily_calls_target: number | null | undefined;
  daily_appointments_target: number | null | undefined;
  monthly_revenue_target: number | null | undefined;
  crm_provider?: string | null;
  crm_connected_at?: string | null;
  first_sync_at?: string | null;
  setup_completed_at?: string | null;
  setup_state: WorkspaceSetupState | null | undefined;
  team_member_count: number;
  mapped_rep_count: number;
}

export type SetupStepId = "company" | "targets" | "team" | "systems";

export interface SetupStep {
  id: SetupStepId;
  label: string;
  complete: boolean;
  deferred: boolean;
  requiredForCompletion: boolean;
}

const MIN_PRODUCT_DESCRIPTION = 20;

export function isCompanyStepValid(input: Pick<WorkspaceSetupInput, "company_name" | "product_description">): boolean {
  const name = (input.company_name ?? "").trim();
  const product = (input.product_description ?? "").trim();
  return name.length >= 2 && product.length >= MIN_PRODUCT_DESCRIPTION;
}

export function isTargetsStepValid(input: Pick<WorkspaceSetupInput, "daily_calls_target" | "daily_appointments_target" | "monthly_revenue_target">): boolean {
  const calls = Number(input.daily_calls_target);
  const appts = Number(input.daily_appointments_target);
  const revenue = Number(input.monthly_revenue_target);
  return (
    Number.isFinite(calls) && calls > 0 &&
    Number.isFinite(appts) && appts > 0 &&
    Number.isFinite(revenue) && revenue > 0
  );
}

export function isTeamStepComplete(input: Pick<WorkspaceSetupInput, "team_member_count" | "setup_state">): boolean {
  if (input.team_member_count > 1) return true;
  const s = input.setup_state ?? {};
  return Boolean(s.team_reviewed || s.team_deferred);
}

export function isSystemsStepComplete(input: Pick<WorkspaceSetupInput, "crm_provider" | "crm_connected_at" | "first_sync_at" | "setup_state">): boolean {
  const s = input.setup_state ?? {};
  const provider = (input.crm_provider ?? "none") as CrmProvider;
  if (s.systems_deferred) return true;
  // Manual + Dialer.io complete on explicit review — no external adapter to verify.
  if ((provider === "manual" || provider === "dialer_io") && s.systems_reviewed) return true;
  // Legacy Aloware setups stay "complete" if they were previously connected;
  // never allow a fresh setup to satisfy this branch via aloware alone.
  if ((provider === "aloware" || provider === "gohighlevel") && (input.crm_connected_at || input.first_sync_at)) return true;
  return false;
}

export function isSystemsStepDeferred(state: WorkspaceSetupState | null | undefined): boolean {
  return Boolean(state?.systems_deferred);
}

export function isTeamStepDeferred(state: WorkspaceSetupState | null | undefined): boolean {
  return Boolean(state?.team_deferred);
}

export function computeSetupSteps(input: WorkspaceSetupInput): SetupStep[] {
  return [
    {
      id: "company",
      label: "Company",
      complete: isCompanyStepValid(input),
      deferred: false,
      requiredForCompletion: true,
    },
    {
      id: "targets",
      label: "Targets & brand",
      complete: isTargetsStepValid(input),
      deferred: false,
      requiredForCompletion: true,
    },
    {
      id: "team",
      label: "Team",
      complete: isTeamStepComplete(input),
      deferred: isTeamStepDeferred(input.setup_state) && input.team_member_count <= 1,
      requiredForCompletion: false,
    },
    {
      id: "systems",
      label: "Systems",
      complete: isSystemsStepComplete(input),
      deferred: isSystemsStepDeferred(input.setup_state),
      requiredForCompletion: false,
    },
  ];
}

export interface SetupProgress {
  steps: SetupStep[];
  completedCount: number;
  totalCount: number;
  percent: number;
  canComplete: boolean;
  nextStep: SetupStepId | null;
  isComplete: boolean;
}

export function computeSetupProgress(input: WorkspaceSetupInput): SetupProgress {
  const steps = computeSetupSteps(input);
  const completedCount = steps.filter((s) => s.complete).length;
  const totalCount = steps.length;
  const percent = Math.round((completedCount / totalCount) * 100);
  const canComplete = steps
    .filter((s) => s.requiredForCompletion)
    .every((s) => s.complete);
  const nextStep = steps.find((s) => !s.complete)?.id ?? null;
  return {
    steps,
    completedCount,
    totalCount,
    percent,
    canComplete,
    nextStep,
    isComplete: Boolean(input.setup_completed_at),
  };
}

export const WORKSPACE_SETUP_ROUTE = "/workspace-setup";

/** Deep-link helper for jumping to a specific wizard step. */
export function workspaceSetupStepUrl(step: SetupStepId): string {
  return `${WORKSPACE_SETUP_ROUTE}?step=${step}`;
}
