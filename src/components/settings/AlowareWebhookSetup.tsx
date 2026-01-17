import { Copy, Check, ExternalLink, Webhook } from 'lucide-react';
import { useState } from 'react';
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from '@/components/ui/viper-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export function AlowareWebhookSetup() {
  const [copied, setCopied] = useState(false);
  
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aloware-webhook-receiver`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ViperCard variant="glass">
      <ViperCardHeader>
        <ViperCardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          Webhook Configuration
        </ViperCardTitle>
      </ViperCardHeader>
      <ViperCardContent className="space-y-6">
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <h4 className="font-medium mb-2">Automatic Call Sync</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Configure this webhook URL in your Aloware account to automatically sync calls, 
            recordings, and transcriptions to SalesFloor.
          </p>

          {/* Webhook URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Webhook URL</label>
            <div className="flex gap-2">
              <Input
                value={webhookUrl}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="space-y-4">
          <h4 className="font-medium">Setup Instructions</h4>
          
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <Badge variant="outline" className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                1
              </Badge>
              <div>
                <p className="font-medium">Open Aloware Settings</p>
                <p className="text-muted-foreground">
                  Go to Aloware → Settings → Integrations → Webhooks
                </p>
              </div>
            </li>
            
            <li className="flex gap-3">
              <Badge variant="outline" className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                2
              </Badge>
              <div>
                <p className="font-medium">Add New Webhook</p>
                <p className="text-muted-foreground">
                  Click "Add Webhook" and paste the URL above
                </p>
              </div>
            </li>
            
            <li className="flex gap-3">
              <Badge variant="outline" className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                3
              </Badge>
              <div>
                <p className="font-medium">Select Events</p>
                <p className="text-muted-foreground">
                  Enable these webhook events:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary">Call Completed</Badge>
                  <Badge variant="secondary">Transcription Saved</Badge>
                </div>
              </div>
            </li>
            
            <li className="flex gap-3">
              <Badge variant="outline" className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                4
              </Badge>
              <div>
                <p className="font-medium">Set Method to POST</p>
                <p className="text-muted-foreground">
                  Ensure the HTTP method is set to POST
                </p>
              </div>
            </li>
            
            <li className="flex gap-3">
              <Badge variant="outline" className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                5
              </Badge>
              <div>
                <p className="font-medium">Save & Test</p>
                <p className="text-muted-foreground">
                  Save the webhook and use Aloware's test feature to verify connectivity
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* Features */}
        <div className="p-4 rounded-lg bg-muted/50 space-y-3">
          <h4 className="font-medium text-sm">What Gets Synced Automatically</h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Call records with duration and disposition
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Recording URLs for playback
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Full call transcriptions
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              AI-powered call analysis & scoring
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Automatic stats updates
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Objection detection & coaching insights
            </li>
          </ul>
        </div>

        {/* Link to Aloware */}
        <Button variant="outline" className="w-full gap-2" asChild>
          <a href="https://app.aloware.com/settings/integrations" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Open Aloware Integrations
          </a>
        </Button>
      </ViperCardContent>
    </ViperCard>
  );
}
