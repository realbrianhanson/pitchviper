import { useState, useEffect } from 'react';
import { Phone, CheckCircle2, XCircle, RefreshCw, Link2, Loader2, Save } from 'lucide-react';
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from '@/components/ui/viper-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAlowareConnection } from '@/hooks/useAlowareConnection';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function AlowareConnectionCard() {
  const { user, profile } = useAuth();
  const {
    connectionStatus,
    isLoadingStatus,
    isVerifying,
    verifyConnection,
    linkUser,
    isLinking,
    refetchStatus,
  } = useAlowareConnection();

  const [alowareUserId, setAlowareUserId] = useState('');
  const [defaultLine, setDefaultLine] = useState('');
  const [isSavingLine, setIsSavingLine] = useState(false);
  const [apiNotConfigured, setApiNotConfigured] = useState(false);

  useEffect(() => {
    // Load the default line from profile
    const loadDefaultLine = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('default_aloware_line')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data?.default_aloware_line) {
        setDefaultLine(data.default_aloware_line);
      }
    };
    loadDefaultLine();
  }, [user]);

  const handleTestConnection = async () => {
    const result = await verifyConnection();
    if (result.error?.includes('not configured')) {
      setApiNotConfigured(true);
    } else {
      setApiNotConfigured(false);
      refetchStatus();
    }
  };

  const handleLinkAccount = () => {
    if (alowareUserId.trim()) {
      linkUser(alowareUserId.trim());
      setAlowareUserId('');
    }
  };

  const handleSaveDefaultLine = async () => {
    if (!user) return;
    
    setIsSavingLine(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ default_aloware_line: defaultLine.trim() || null })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Default outbound line saved!');
    } catch (error) {
      console.error('Error saving default line:', error);
      toast.error('Failed to save default line');
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
          Phone System - Aloware
        </ViperCardTitle>
      </ViperCardHeader>
      <ViperCardContent className="space-y-6">
        {/* API Not Configured Warning */}
        {apiNotConfigured && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Setup Required:</strong> The Aloware API token hasn't been configured yet. 
              Please contact your manager to set up the integration.
            </p>
          </div>
        )}

        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            {connectionStatus?.connected ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">
                {connectionStatus?.connected ? 'Connected' : 'Not Connected'}
              </p>
              {connectionStatus?.alowareUserId && (
                <p className="text-sm text-muted-foreground">
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
          <Badge variant={connectionStatus?.connected ? 'default' : 'secondary'}>
            {connectionStatus?.connected ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Default Outbound Line */}
        {connectionStatus?.connected && (
          <div className="space-y-2 p-4 rounded-lg bg-muted/30 border border-border">
            <Label htmlFor="default-line" className="font-medium">Default Outbound Line</Label>
            <div className="flex gap-2">
              <Input
                id="default-line"
                placeholder="+1XXXXXXXXXX"
                value={defaultLine}
                onChange={(e) => setDefaultLine(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleSaveDefaultLine}
                disabled={isSavingLine}
                size="sm"
              >
                {isSavingLine ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your Aloware phone number (e.g., +18551234567). This will be used when making calls.
            </p>
          </div>
        )}

        {/* Test Connection */}
        <div className="space-y-2">
          <Label>Test API Connection</Label>
          <Button 
            onClick={handleTestConnection}
            disabled={isVerifying}
            variant="outline"
            className="w-full"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Test Connection
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Tests the connection to Aloware using the configured API token
          </p>
        </div>

        {/* Link Aloware User ID */}
        {!connectionStatus?.connected && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="space-y-2">
              <Label htmlFor="aloware-user-id">Your Aloware User ID</Label>
              <Input
                id="aloware-user-id"
                placeholder="Enter your Aloware user ID"
                value={alowareUserId}
                onChange={(e) => setAlowareUserId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Find your user ID in your Aloware profile settings
              </p>
            </div>
            <Button 
              onClick={handleLinkAccount}
              disabled={!alowareUserId.trim() || isLinking}
              className="w-full"
            >
              {isLinking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  Link Account
                </>
              )}
            </Button>
          </div>
        )}

        {/* Info Box */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <h4 className="font-medium text-sm mb-2">About Aloware Integration</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Automatically syncs your calls from Aloware</li>
            <li>• Imports call recordings and transcriptions</li>
            <li>• Tracks talk time and call outcomes</li>
            <li>• Updates your stats in real-time</li>
          </ul>
        </div>
      </ViperCardContent>
    </ViperCard>
  );
}
