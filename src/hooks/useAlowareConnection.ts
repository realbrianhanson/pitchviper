import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface AlowareUser {
  id: string | number;
  name: string;
  email: string;
}

interface ConnectionStatus {
  connected: boolean;
  alowareUserId: string | null;
  lastSyncAt: string | null;
}

interface SyncResult {
  alowareUsers: AlowareUser[];
  matchResults: {
    profileId: string;
    profileName: string;
    currentAlowareId: string | null;
    suggestedAlowareUser: AlowareUser | null;
  }[];
}

export function useAlowareConnection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isVerifying, setIsVerifying] = useState(false);

  // Get connection status
  const { data: connectionStatus, isLoading: isLoadingStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['aloware-connection-status'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data, error } = await supabase.functions.invoke('verify-aloware-connection', {
        body: { action: 'get-status' },
      });

      if (error) throw error;
      return data as ConnectionStatus;
    },
  });

  // Verify connection
  const verifyConnection = useCallback(async () => {
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-aloware-connection', {
        body: { action: 'verify' },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Connection Verified",
          description: `Successfully connected to Aloware. Found ${data.users?.length || 0} users.`,
        });
        return { success: true, users: data.users };
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || "Failed to connect to Aloware",
          variant: "destructive",
        });
        return { success: false, error: data.error };
      }
    } catch (error: any) {
      toast({
        title: "Connection Error",
        description: error.message || "Failed to verify Aloware connection",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsVerifying(false);
    }
  }, [toast]);

  // Link user to Aloware
  const linkUserMutation = useMutation({
    mutationFn: async (alowareUserId: string) => {
      const { data, error } = await supabase.functions.invoke('verify-aloware-connection', {
        body: { action: 'link-user', alowareUserId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Account Linked",
        description: "Your account has been linked to Aloware",
      });
      queryClient.invalidateQueries({ queryKey: ['aloware-connection-status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Link Failed",
        description: error.message || "Failed to link Aloware account",
        variant: "destructive",
      });
    },
  });

  // Sync team members (manager only)
  const syncTeamMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('verify-aloware-connection', {
        body: { action: 'sync-team' },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data as SyncResult & { success: boolean; message: string };
    },
    onSuccess: (data) => {
      toast({
        title: "Team Synced",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync team members",
        variant: "destructive",
      });
    },
  });

  // Map a profile to Aloware user (manager only)
  const mapUserMutation = useMutation({
    mutationFn: async ({ profileId, alowareUserId }: { profileId: string; alowareUserId: string }) => {
      const { data, error } = await supabase.functions.invoke('verify-aloware-connection', {
        body: { action: 'map-user', profileId, alowareUserId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "User Mapped",
        description: "User has been mapped to Aloware account",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Mapping Failed",
        description: error.message || "Failed to map user",
        variant: "destructive",
      });
    },
  });

  return {
    connectionStatus,
    isLoadingStatus,
    isVerifying,
    verifyConnection,
    linkUser: linkUserMutation.mutate,
    isLinking: linkUserMutation.isPending,
    syncTeam: syncTeamMutation.mutateAsync,
    isSyncing: syncTeamMutation.isPending,
    syncResult: syncTeamMutation.data,
    mapUser: mapUserMutation.mutate,
    isMapping: mapUserMutation.isPending,
    refetchStatus,
  };
}
