import { useState } from 'react';
import { Phone, CheckCircle2, XCircle, RefreshCw, Link2, Loader2 } from 'lucide-react';
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from '@/components/ui/viper-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAlowareConnection } from '@/hooks/useAlowareConnection';
import { formatDistanceToNow } from 'date-fns';

export function AlowareConnectionCard() {
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

  const handleTestConnection = async () => {
    await verifyConnection();
    refetchStatus();
  };

  const handleLinkAccount = () => {
    if (alowareUserId.trim()) {
      linkUser(alowareUserId.trim());
      setAlowareUserId('');
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
