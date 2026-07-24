// Manager-only Aloware company connection panel.
// - Password input for the API token (autocomplete new-password, cleared on any
//   settle path so nothing lingers in memory / DevTools autofill).
// - Never displays the token back.
// - Disconnect requires typing the exact confirmation string.
// - Never instructs the user to add ALOWARE_API_TOKEN or a global webhook
//   secret to Lovable Cloud — this is the only supported path now.
import { useState } from "react";
import { Phone, CheckCircle2, XCircle, Loader2, ShieldCheck, ShieldAlert, RefreshCw, Unplug } from "lucide-react";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { useAlowareIntegration } from "@/hooks/useAlowareIntegration";

export function AlowareCompanyConnection() {
  const {
    enabled,
    status,
    isLoading,
    saveToken,
    verify,
    disconnect,
  } = useAlowareIntegration();

  const [token, setToken] = useState("");
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  if (!enabled) return null;

  const connected = status?.status === "connected" && status.has_token;

  const handleSave = async () => {
    const value = token.trim();
    if (value.length < 4) return;
    try {
      await saveToken.mutateAsync(value);
    } finally {
      setToken(""); // never keep token in memory past submit
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect.mutateAsync();
    } finally {
      setDisconnectOpen(false);
      setConfirmText("");
    }
  };

  return (
    <ViperCard variant="glass">
      <ViperCardHeader>
        <ViperCardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          Company Aloware Connection
        </ViperCardTitle>
      </ViperCardHeader>
      <ViperCardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-4 rounded-none border border-border bg-muted/40">
              <div className="flex items-center gap-3">
                {connected ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" data-testid="aloware-connected-icon" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {connected ? "Connected" : "Not connected"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {status?.last_verified_at
                      ? `Last verified ${formatDistanceToNow(new Date(status.last_verified_at), { addSuffix: true })}`
                      : "This company has never verified an Aloware token."}
                  </p>
                </div>
              </div>
              <Badge variant={connected ? "default" : "secondary"} className="rounded-none">
                {connected ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aloware-token" className="font-medium">
                Aloware API token
              </Label>
              <div className="flex gap-2">
                <Input
                  id="aloware-token"
                  type="password"
                  autoComplete="new-password"
                  spellCheck={false}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={connected ? "Replace stored token…" : "Paste token from Aloware settings"}
                />
                <Button
                  onClick={handleSave}
                  disabled={saveToken.isPending || token.trim().length < 4}
                  className="shrink-0"
                >
                  {saveToken.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  <span className="ml-2">Save & verify</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                We verify the token against Aloware before storing it in a hardware-backed
                secret vault. The value never touches your browser again after you save it.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                onClick={() => verify.mutate()}
                disabled={!connected || verify.isPending}
              >
                {verify.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Verify again
              </Button>
              <Button
                variant="ghost"
                onClick={() => setDisconnectOpen(true)}
                disabled={!status?.has_token && !status?.has_webhook_secret}
                className="text-destructive hover:text-destructive"
              >
                <Unplug className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>

            {status?.status === "error" && (
              <div className="flex items-start gap-2 text-xs text-destructive">
                <ShieldAlert className="h-4 w-4 mt-[2px]" />
                <span>Aloware rejected the stored token on last check. Save a fresh one.</span>
              </div>
            )}
          </>
        )}
      </ViperCardContent>

      <Dialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Aloware?</DialogTitle>
            <DialogDescription>
              This deletes your company's stored Aloware API token and webhook secret. Reps
              on your team will no longer be able to place calls, send SMS, or receive call
              events until a manager reconnects.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="disconnect-confirm">
              Type <span className="font-mono">DISCONNECT</span> to confirm
            </Label>
            <Input
              id="disconnect-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== "DISCONNECT" || disconnect.isPending}
              onClick={handleDisconnect}
            >
              {disconnect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ViperCard>
  );
}
