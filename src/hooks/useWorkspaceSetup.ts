import { useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Json, Tables } from "@/integrations/supabase/types";
import {
  computeSetupProgress,
  type SetupProgress,
  type WorkspaceSetupInput,
  type WorkspaceSetupState,
} from "@/lib/workspaceSetup";

type CompanySettingsRow = Tables<"company_settings">;

export interface UseWorkspaceSetupResult {
  isLoading: boolean;
  error: Error | null;
  settings: CompanySettingsRow | null;
  teamMemberCount: number;
  mappedRepCount: number;
  progress: SetupProgress;
  canManage: boolean;
  teamId: string | null;
  save: (patch: Partial<CompanySettingsRow>, audit?: { action: string; metadata?: Record<string, unknown> }) => Promise<CompanySettingsRow>;
  patchState: (patch: WorkspaceSetupState, audit?: { action: string; metadata?: Record<string, unknown> }) => Promise<CompanySettingsRow>;
  complete: () => Promise<CompanySettingsRow>;
  refetch: () => Promise<unknown>;
}

const EMPTY_SETUP_STATE: WorkspaceSetupState = {};

async function logAudit(action: string, targetType: string, targetId: string | null, metadata: Record<string, unknown>) {
  try {
    await supabase.rpc("log_team_audit_event", {
      p_action: action,
      p_target_type: targetType,
      p_target_id: targetId,
      p_metadata: metadata as unknown as Json,
    });
  } catch (err) {
    // Non-fatal — audit is best-effort.
    console.warn("audit event failed", err);
  }
}

export function useWorkspaceSetup(): UseWorkspaceSetupResult {
  const { profile, user, canManageTeam } = useAuth();
  const teamId = profile?.team_id ?? null;
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => ["workspace-setup", teamId], [teamId]);

  const query = useQuery({
    queryKey,
    enabled: Boolean(teamId),
    queryFn: async () => {
      if (!teamId) throw new Error("No team");
      // Provider-neutral: legacy Aloware per-rep mapping has been retired.
      // Until a real neutral external-rep mapping table exists we report
      // mappedRepCount as 0 to keep the public result shape stable without
      // querying provider-specific columns on profiles.
      const [{ data: settings, error: sErr }, { count: memberCount, error: mErr }] = await Promise.all([
        supabase.from("company_settings").select("*").eq("team_id", teamId).maybeSingle(),
        supabase.from("team_profiles_safe").select("id", { count: "exact", head: true }).eq("team_id", teamId),
      ]);
      if (sErr) throw sErr;
      if (mErr) throw mErr;
      return {
        settings: (settings ?? null) as CompanySettingsRow | null,
        teamMemberCount: memberCount ?? 0,
        mappedRepCount: 0,
      };
    },
  });

  const settings = query.data?.settings ?? null;
  const teamMemberCount = query.data?.teamMemberCount ?? 0;
  const mappedRepCount = query.data?.mappedRepCount ?? 0;

  const setupState: WorkspaceSetupState = useMemo(() => {
    const raw = (settings?.setup_state ?? {}) as WorkspaceSetupState | null;
    return raw ?? EMPTY_SETUP_STATE;
  }, [settings?.setup_state]);

  const input: WorkspaceSetupInput = useMemo(
    () => ({
      company_name: settings?.company_name ?? "",
      product_description: settings?.product_description ?? "",
      industry: settings?.industry ?? null,
      target_audience: settings?.target_audience ?? null,
      brand_color: settings?.brand_color ?? null,
      logo_url: settings?.logo_url ?? null,
      timezone: settings?.timezone ?? null,
      daily_calls_target: settings?.daily_calls_target ?? 0,
      daily_appointments_target: settings?.daily_appointments_target ?? 0,
      monthly_revenue_target: settings?.monthly_revenue_target ?? 0,
      crm_provider: settings?.crm_provider ?? "none",
      crm_connected_at: settings?.crm_connected_at ?? null,
      first_sync_at: settings?.first_sync_at ?? null,
      setup_completed_at: settings?.setup_completed_at ?? null,
      setup_state: setupState,
      team_member_count: teamMemberCount,
      mapped_rep_count: mappedRepCount,
    }),
    [settings, setupState, teamMemberCount, mappedRepCount]
  );

  const progress = useMemo(() => computeSetupProgress(input), [input]);

  const upsertMutation = useMutation({
    mutationFn: async (patch: Partial<CompanySettingsRow>) => {
      if (!teamId) throw new Error("No team");
      if (!canManageTeam) throw new Error("You don't have permission to edit company settings");
      const merged = {
        team_id: teamId,
        updated_by: user?.id ?? null,
        ...patch,
      };
      if (settings?.id) {
        const { data, error } = await supabase
          .from("company_settings")
          .update(merged)
          .eq("id", settings.id)
          .select()
          .maybeSingle();
        if (error) throw error;
        return data as CompanySettingsRow;
      }
      const { data, error } = await supabase
        .from("company_settings")
        .insert(merged as unknown as CompanySettingsRow)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as CompanySettingsRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const save = useCallback(
    async (patch: Partial<CompanySettingsRow>, audit?: { action: string; metadata?: Record<string, unknown> }) => {
      const row = await upsertMutation.mutateAsync(patch);
      if (audit && row?.team_id) {
        await logAudit(audit.action, "company_settings", row.id, audit.metadata ?? {});
      }
      return row;
    },
    [upsertMutation]
  );

  const patchState = useCallback(
    async (patch: WorkspaceSetupState, audit?: { action: string; metadata?: Record<string, unknown> }) => {
      const nextState = { ...setupState, ...patch };
      return save({ setup_state: nextState as unknown as Json }, audit);
    },
    [save, setupState]
  );

  const complete = useCallback(async () => {
    return save(
      {
        setup_completed_at: new Date().toISOString(),
      },
      { action: "workspace_setup_completed", metadata: { percent: progress.percent } }
    );
  }, [save, progress.percent]);

  return {
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
    settings,
    teamMemberCount,
    mappedRepCount,
    progress,
    canManage: canManageTeam,
    teamId,
    save,
    patchState,
    complete,
    refetch: query.refetch,
  };
}
