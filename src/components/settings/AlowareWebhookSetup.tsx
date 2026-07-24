// Per-tenant Aloware webhook setup. The URL is generated server-side and
// contains an opaque webhook_key; the shared bearer secret is only ever
// visible ONCE in the rotate modal and is not persisted client-side.
import { useState } from "react";
import { Copy, Check, Webhook, KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAlowareIntegration } from "@/hooks/useAlowareIntegration";
import { toast } from "sonner";

export function AlowareWebhookSetup() {
  const { enabled, status, webhookUrl, rotate } = useAlowareIntegration();
  const [copied, setCopied] = useState<"url" | "secret" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [revealed, setRevealed] = useState<{ url: string; secret: string } | null>(null);

  if (!enabled) return null;

  const canShowUrl = Boolean(webhookUrl);
  const hasSecret = Boolean(status?.has_webhook_secret);

  const copy = async (kind: "url" | "secret", value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRotate = async () => {
    try {
      const data = await rotate.mutateAsync();
      setRevealed({ url: data.webhook_url, secret: data.webhook_secret });
      toast.success("Webhook credentials rotated. Copy the secret now — it will not be shown again.");
    } catch {
      // hook already surfaced the error
    } finally {
      setConfirmOpen(false);
    }
  };

  return (
    <ViperCard variant="glass">
      <ViperCardHeader>
        <ViperCardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          Aloware Webhook
        </ViperCardTitle>
      </ViperCardHeader>
      <ViperCardContent className="space-y-6">
        <div className="p-4 rounded-none border border-border bg-muted/40 space-y-2">
          <p className="text-sm text-muted-foreground">
            Paste this URL into Aloware → Settings → Integrations → Webhooks. Use HTTP method
            <span className="font-mono"> POST</span> and authentication
            <span className="font-mono"> Bearer token</span>.
          </p>
          <div className="flex gap-2">
            <Input
              value={canShowUrl ? webhookUrl! : "Save an API token to generate your unique webhook URL"}
              readOnly
              className="font-mono text-xs"
            />
            <Button
              variant="outline"
              size="icon"
              disabled={!canShowUrl}
              onClick={() => canShowUrl && copy("url", webhookUrl!)}
            >
              {copied === "url" ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary" className="rounded-none">Call Completed</Badge>
            <Badge variant="secondary" className="rounded-none">Transcription Saved</Badge>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-medium text-sm flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                Webhook Bearer secret
              </p>
              <p className="text-xs text-muted-foreground">
                {hasSecret
                  ? "A secret is stored. Rotate to replace it — the new value is shown only once."
                  : "No secret yet. Generate one to enable inbound events."}
              </p>
            </div>
            <Button onClick={() => setConfirmOpen(true)} disabled={rotate.isPending}>
              {rotate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {hasSecret ? "Rotate secret" : "Generate secret"}
            </Button>
          </div>
        </div>
      </ViperCardContent>

      {/* Confirm rotation */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{hasSecret ? "Rotate webhook secret?" : "Generate webhook secret?"}</DialogTitle>
            <DialogDescription>
              {hasSecret
                ? "The existing secret will stop working immediately. Update the new value in Aloware right after copying it."
                : "A new secret will be generated and shown to you exactly once. Copy it into Aloware straight away."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleRotate} disabled={rotate.isPending}>
              {rotate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One-time reveal */}
      <Dialog open={!!revealed} onOpenChange={(open) => !open && setRevealed(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy your new webhook secret</DialogTitle>
            <DialogDescription>
              This value will not be shown again. Paste it into Aloware as a Bearer token.
              If you lose it, rotate to generate a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Webhook URL</p>
              <div className="flex gap-2">
                <Input readOnly value={revealed?.url ?? ""} className="font-mono text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => revealed && copy("url", revealed.url)}
                >
                  {copied === "url" ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Bearer secret</p>
              <div className="flex gap-2">
                <Input readOnly value={revealed?.secret ?? ""} className="font-mono text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => revealed && copy("secret", revealed.secret)}
                >
                  {copied === "secret" ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldAlert className="h-4 w-4 mt-[2px] text-primary" />
              <span>
                PitchViper stores the secret in a hardware-backed vault; we do not keep a
                readable copy anywhere. Rotate to replace it.
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealed(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ViperCard>
  );
}
