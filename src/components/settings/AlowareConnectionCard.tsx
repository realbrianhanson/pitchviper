// Rep-facing Aloware panel: personal linking + default outbound line.
// The company connection lives in AlowareCompanyConnection (manager-only).
// Reps see a neutral note when the company hasn't connected yet — no token
// or webhook controls are shown to non-managers.
import { useState, useEffect } from "react";
import { Phone, CheckCircle2, XCircle, RefreshCw, Link2, Loader2, Save, ShieldAlert } from "lucide-react";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAlowareConnection } from "@/hooks/useAlowareConnection";
import { useAlowareIntegration } from "@/hooks/useAlowareIntegration";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function AlowareConnectionCard() {
  const { user, canManageTeam } = useAuth();
  const {
    connectionStatus,
    isLoadingStatus,
    isVerifying,
    verifyConnection,
    linkUser,
    isLinking,
    refetchStatus,
  } = useAlowareConnection();
  const { status: companyStatus } = useAlowareIntegration();

  const [alowareUserId, setAlowareUserId] = useState("");
  const [defaultLine, setDefaultLine] = useState("");
  const [isSavingLine, setIsSavingLine] = useState(false);

  useEffect(() => {
    const loadDefaultLine = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("default_aloware_line")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.default_aloware_line) setDefaultLine(data.default_aloware_line);
    };
    loadDefaultLine();
  }, [user]);

  const companyConnected = canManageTeam
    ? companyStatus?.status === "connected" && companyStatus.has_token
    : true; // reps rely on the server; they cannot see company status directly

  const handleTest = async () => {
    await verifyConnection();
    refetchStatus();
  };

  const handleLink = () => {
    const value = alowareUserId.trim();
    if (!value) return;
    linkUser(value);
    setAlowareUserId("");
  };

  const handleSaveLine = async () => {
    if (!user) return;
    setIsSavingLine(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ default_aloware_line: defaultLine.trim() || null })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Default outbound line saved.");
    } catch {
      toast.error("Failed to save default line.");
    } finally {
      setIsSavingLine(false);
    }
  };

  if (isLoadingStatus) {
    return (
      <ViperCard variant="glass">
        <ViperCardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </ViperCardContent>
      </ViperCard>
    );
  }

  return (
    <ViperCard variant="glass">
      <ViperCardHeader>
        <ViperCardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          Your Aloware Link
        </ViperCardTitle>
      </ViperCardHeader>
      <ViperCardContent className="space-y-6">
        {canManageTeam && !companyConnected && (
          <div className="p-4 rounded-none border border-border bg-muted/40 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 mt-[2px] text-primary" />
            <p className="text-sm text-muted-foreground">
              Save your company's Aloware token above before linking reps or making calls.
            </p>
          </div>
        )}
        {!canManageTeam && (
          <p className="text-xs text-muted-foreground">
            Your company's Aloware connection is managed by an admin.
          </p>
        )}

        <div className="flex items-center justify-between p-4 rounded-none border border-border bg-muted/40">
          <div className="flex items-center gap-3">
            {connectionStatus?.connected ? (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">
                {connectionStatus?.connected ? "Linked" : "Not linked"}
              </p>
              {connectionStatus?.alowareUserId && (
                <p className="text-xs text-muted-foreground">
                  Aloware ID: {connectionStatus.alowareUserId}
                </p>
              )}
              {connectionStatus?.lastSyncAt && (
                <p className="text-xs text-muted-foreground">
                  Last sync: {formatDistanceToNow(new Date(connectionStatus.lastSyncAt), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
          <Badge variant={connectionStatus?.connected ? "default" : "secondary"} className="rounded-none">
            {connectionStatus?.connected ? "Active" : "Inactive"}
          </Badge>
        </div>

        {connectionStatus?.connected && (
          <div className="space-y-2 p-4 rounded-none border border-border bg-muted/30">
            <Label htmlFor="default-line" className="font-medium">Default outbound line</Label>
            <div className="flex gap-2">
              <Input
                id="default-line"
                placeholder="+1XXXXXXXXXX"
                value={defaultLine}
                onChange={(e) => setDefaultLine(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSaveLine} disabled={isSavingLine} size="sm">
                {isSavingLine ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your Aloware phone number (e.g., +18551234567). This will be used when making calls.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label>Test connection</Label>
          <Button onClick={handleTest} disabled={isVerifying || !companyConnected} variant="outline" className="w-full">
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" /> Test connection
              </>
            )}
          </Button>
        </div>

        {!connectionStatus?.connected && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="space-y-2">
              <Label htmlFor="aloware-user-id">Your Aloware user ID</Label>
              <Input
                id="aloware-user-id"
                placeholder="Enter your Aloware user ID"
                value={alowareUserId}
                onChange={(e) => setAlowareUserId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Find your user ID in your Aloware profile settings.
              </p>
            </div>
            <Button
              onClick={handleLink}
              disabled={!alowareUserId.trim() || isLinking || !companyConnected}
              className="w-full"
            >
              {isLinking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Linking…
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" /> Link account
                </>
              )}
            </Button>
          </div>
        )}
      </ViperCardContent>
    </ViperCard>
  );
}
