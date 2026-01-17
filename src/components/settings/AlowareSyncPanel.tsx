import { useState } from "react";
import { RefreshCw, Users, Phone, UserPlus, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SyncResult {
  synced: number;
  skipped: number;
  total: number;
  error?: string;
}

interface SyncResults {
  users?: SyncResult;
  calls?: SyncResult;
  contacts?: SyncResult;
}

export function AlowareSyncPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncType, setSyncType] = useState<string | null>(null);
  const [lastResults, setLastResults] = useState<SyncResults | null>(null);

  const handleSync = async (type: "all" | "users" | "calls" | "contacts") => {
    if (!user) return;

    setIsSyncing(true);
    setSyncType(type);

    try {
      // Get user's team
      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.team_id) {
        toast({
          title: "No Team Found",
          description: "You must be part of a team to sync Aloware data.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("sync-aloware-data", {
        body: {
          syncType: type,
          teamId: profile.team_id,
          userId: user.id,
          daysBack: 30,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setLastResults(data.results);
        
        const totalSynced = Object.values(data.results as SyncResults).reduce(
          (sum: number, r: SyncResult | undefined) => sum + (r?.synced || 0),
          0
        );

        toast({
          title: "Sync Complete!",
          description: `Successfully synced ${totalSynced} records from Aloware.`,
        });
      } else {
        throw new Error(data?.error || "Sync failed");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to sync";
      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
      setSyncType(null);
    }
  };

  const renderSyncResult = (label: string, result?: SyncResult) => {
    if (!result) return null;

    return (
      <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          {result.error ? (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Error
            </Badge>
          ) : (
            <>
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {result.synced} synced
              </Badge>
              {result.skipped > 0 && (
                <Badge variant="secondary">{result.skipped} skipped</Badge>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          Aloware Data Sync
        </CardTitle>
        <CardDescription>
          Sync your team's Aloware user accounts. Call data syncs automatically via webhooks.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Users Sync */}
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-foreground">Sync Team Users</h4>
              <p className="text-sm text-muted-foreground">
                Link Aloware users to team member profiles
              </p>
            </div>
            <Button
              onClick={() => handleSync("users")}
              disabled={isSyncing}
              className="gap-2"
            >
              {isSyncing && syncType === "users" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              Sync Users
            </Button>
          </div>
        </div>

        {/* Contacts Import - Extract contacts from call history */}
        <div className="p-4 rounded-lg bg-success/10 border border-success/20">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-foreground">Import Contacts from Calls</h4>
              <p className="text-sm text-muted-foreground">
                Extract unique contacts from your last 90 days of Aloware calls and add them as pipeline deals
              </p>
            </div>
            <Button
              onClick={() => handleSync("contacts")}
              disabled={isSyncing}
              variant="default"
              className="gap-2"
            >
              {isSyncing && syncType === "contacts" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Import Contacts
            </Button>
          </div>
        </div>

        {/* Last Sync Results */}
        {lastResults && (lastResults.users || lastResults.contacts) && (
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <h4 className="text-sm font-medium text-foreground mb-3">Last Sync Results</h4>
            {renderSyncResult("Users", lastResults.users)}
            {renderSyncResult("Contacts → Deals", lastResults.contacts)}
          </div>
        )}

        {/* Call Data Info */}
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-medium text-foreground">About Call Data</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Aloware's API doesn't support bulk call history exports. Call data syncs automatically 
                through webhooks as calls happen. Go to the <strong>Webhook</strong> tab to set this up.
              </p>
            </div>
          </div>
        </div>

        {/* Auto-sync info */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
          <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Real-time Sync via Webhooks</p>
            <p className="text-xs text-muted-foreground">
              Once configured, all calls, recordings, and transcriptions sync automatically as they happen.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
