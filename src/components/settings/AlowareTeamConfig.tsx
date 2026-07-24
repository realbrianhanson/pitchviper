import { useState } from 'react';
import { Users, RefreshCw, Link2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from '@/components/ui/viper-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAlowareConnection } from '@/hooks/useAlowareConnection';

interface AlowareUser {
  id: string | number;
  name: string;
  email: string;
}

interface MatchResult {
  profileId: string;
  profileName: string;
  currentAlowareId: string | null;
  suggestedAlowareUser: AlowareUser | null;
}

export function AlowareTeamConfig() {
  const {
    isVerifying,
    verifyConnection,
    syncTeam,
    isSyncing,
    syncResult,
    mapUser,
    isMapping,
  } = useAlowareConnection();

  const [alowareUsers, setAlowareUsers] = useState<AlowareUser[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [selectedMappings, setSelectedMappings] = useState<Record<string, string>>({});
  const [hasSynced, setHasSynced] = useState(false);
  const [apiConfigured, setApiConfigured] = useState<boolean | null>(null);

  const handleVerifyApi = async () => {
    const result = await verifyConnection();
    if (result.success && result.users) {
      setAlowareUsers(result.users);
      setApiConfigured(true);
    } else if (result.error?.includes('not configured')) {
      setApiConfigured(false);
    }
  };

  const handleSyncTeam = async () => {
    try {
      const result = await syncTeam();
      if (result.alowareUsers) {
        setAlowareUsers(result.alowareUsers);
        setApiConfigured(true);
      }
      if (result.matchResults) {
        setMatchResults(result.matchResults);
        // Pre-populate suggested mappings
        const suggested: Record<string, string> = {};
        result.matchResults.forEach((m: MatchResult) => {
          if (m.currentAlowareId) {
            suggested[m.profileId] = m.currentAlowareId;
          } else if (m.suggestedAlowareUser) {
            suggested[m.profileId] = String(m.suggestedAlowareUser.id);
          }
        });
        setSelectedMappings(suggested);
      }
      setHasSynced(true);
    } catch (error: any) {
      console.error('Sync failed:', error);
      if (error.message?.includes('not configured')) {
        setApiConfigured(false);
      }
    }
  };

  const handleMapUser = (profileId: string) => {
    const alowareUserId = selectedMappings[profileId];
    if (alowareUserId) {
      mapUser({ profileId, alowareUserId });
    }
  };

  // Show setup required message if API is not configured
  if (apiConfigured === false) {
    return (
      <ViperCard variant="glass">
        <ViperCardHeader>
          <ViperCardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Aloware Configuration
          </ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent className="space-y-6">
          <div className="p-6 rounded-none border border-border bg-muted/40 text-center">
            <AlertCircle className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Company connection required</h3>
            <p className="text-muted-foreground mb-4">
              Save and verify your company's Aloware API token in the
              <strong className="mx-1">Company Aloware Connection</strong>
              card above before syncing team members.
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setApiConfigured(null)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </ViperCardContent>
      </ViperCard>
    );
  }


  return (
    <ViperCard variant="glass">
      <ViperCardHeader>
        <ViperCardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Aloware Configuration
        </ViperCardTitle>
      </ViperCardHeader>
      <ViperCardContent className="space-y-6">
        {/* API Token Status */}
        <div className="p-4 rounded-lg bg-muted/50 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Master API Token</h4>
              <p className="text-sm text-muted-foreground">
                Configured in Lovable Cloud secrets
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleVerifyApi}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Test Token'
              )}
            </Button>
          </div>

          {alowareUsers.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Found {alowareUsers.length} Aloware users</span>
            </div>
          )}
        </div>

        {/* Sync Team Button */}
        <div className="space-y-2">
          <Button
            onClick={handleSyncTeam}
            disabled={isSyncing}
            className="w-full"
          >
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing Team...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Team Members
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Pulls Aloware users and attempts to match with team members by name/email
          </p>
        </div>

        {/* User Mapping Table */}
        {hasSynced && matchResults.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-border">
            <h4 className="font-medium flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              User Mapping
            </h4>
            
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead>Aloware User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchResults.map((match) => (
                    <TableRow key={match.profileId}>
                      <TableCell className="font-medium">
                        {match.profileName}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={selectedMappings[match.profileId] || ''}
                          onValueChange={(value) => 
                            setSelectedMappings(prev => ({
                              ...prev,
                              [match.profileId]: value
                            }))
                          }
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select Aloware user" />
                          </SelectTrigger>
                          <SelectContent>
                            {alowareUsers.map((user) => (
                              <SelectItem key={user.id} value={String(user.id)}>
                                {user.name} ({user.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {match.currentAlowareId ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Linked
                          </Badge>
                        ) : match.suggestedAlowareUser ? (
                          <Badge variant="secondary" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Suggested
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not Linked</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMapUser(match.profileId)}
                          disabled={!selectedMappings[match.profileId] || isMapping}
                        >
                          {isMapping ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Save'
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Setup Instructions
          </h4>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Add your Aloware API token in Cloud Secrets (ALOWARE_API_TOKEN)</li>
            <li>Click "Test Token" to verify the connection</li>
            <li>Click "Sync Team Members" to pull Aloware users</li>
            <li>Map each team member to their Aloware account</li>
          </ol>
        </div>
      </ViperCardContent>
    </ViperCard>
  );
}
