// Manager-only Aloware integration hook. Talks to the manage-aloware-integration
// edge function which owns Vault storage of the per-team API token + webhook
// secret. Nothing in this hook may ever cache token/secret plaintext.
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface AlowareIntegrationStatus {
  provider: "aloware";
  status: "disconnected" | "connected" | "error";
  has_token: boolean;
  has_webhook_secret: boolean;
  webhook_key: string | null;
  last_verified_at: string | null;
}

interface StatusResponse {
  ok: true;
  status: AlowareIntegrationStatus;
  webhook_url: string | null;
}

interface RotateResponse {
  ok: true;
  webhook_secret: string;
  webhook_url: string;
}

const QUERY_KEY = ["aloware-integration-status"] as const;

async function invokeManage(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("manage-aloware-integration", {
    body,
  });
  if (error) {
    // Prefer stable server codes over transport error strings.
    const code = (data && typeof data === "object" && "error" in data && typeof (data as Record<string, unknown>).error === "string")
      ? (data as Record<string, string>).error
      : "internal_error";
    throw new Error(code);
  }
  return data;
}

export function useAlowareIntegration() {
  const { canManageTeam, profile } = useAuth();
  const queryClient = useQueryClient();
  const enabled = Boolean(canManageTeam && profile?.team_id);

  const statusQuery = useQuery({
    queryKey: QUERY_KEY,
    enabled,
    queryFn: async () => {
      const data = (await invokeManage({ action: "status" })) as StatusResponse;
      return data;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const saveToken = useMutation({
    mutationFn: async (token: string) => {
      await invokeManage({ action: "save-token", token });
    },
    onSuccess: () => {
      toast.success("Aloware token saved and verified.");
      invalidate();
    },
    onError: (err: Error) => {
      toast.error(err.message === "invalid_token"
        ? "That token was rejected by Aloware. Double-check the value and try again."
        : "Could not save Aloware token.");
    },
  });

  const verify = useMutation({
    mutationFn: async () => {
      await invokeManage({ action: "verify" });
    },
    onSuccess: () => {
      toast.success("Aloware connection is healthy.");
      invalidate();
    },
    onError: (err: Error) => {
      if (err.message === "integration_not_configured") {
        toast.error("Save an Aloware API token first.");
      } else if (err.message === "invalid_token") {
        toast.error("Aloware rejected the stored token. Save a fresh one.");
      } else {
        toast.error("Could not verify Aloware connection.");
      }
      invalidate();
    },
  });

  const rotate = useMutation({
    mutationFn: async () => {
      const data = (await invokeManage({ action: "rotate-webhook-secret" })) as RotateResponse;
      return data;
    },
    onSuccess: () => {
      invalidate();
    },
    onError: () => toast.error("Could not rotate webhook credentials."),
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      await invokeManage({ action: "disconnect", confirm: "DISCONNECT" });
    },
    onSuccess: () => {
      toast.success("Aloware disconnected. All stored credentials removed.");
      invalidate();
    },
    onError: () => toast.error("Could not disconnect Aloware."),
  });

  const refresh = useCallback(() => invalidate(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    enabled,
    status: statusQuery.data?.status ?? null,
    webhookUrl: statusQuery.data?.webhook_url ?? null,
    isLoading: statusQuery.isLoading,
    error: statusQuery.error as Error | null,
    saveToken,
    verify,
    rotate,
    disconnect,
    refresh,
  };
}
