import { useState, useEffect } from 'react';
import { Phone, X, Loader2, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useClickToDial } from '@/hooks/useClickToDial';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export function DialModal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    isDialModalOpen, 
    closeDialModal, 
    pendingDial, 
    isDialing, 
    initiateCall 
  } = useClickToDial();
  
  const [defaultLine, setDefaultLine] = useState<string | null>(null);
  const [overrideLine, setOverrideLine] = useState('');
  const [isLoadingLine, setIsLoadingLine] = useState(true);

  useEffect(() => {
    const loadDefaultLine = async () => {
      if (!user) return;
      setIsLoadingLine(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('default_aloware_line')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setDefaultLine(data?.default_aloware_line || null);
      } finally {
        setIsLoadingLine(false);
      }
    };
    
    if (isDialModalOpen) {
      loadDefaultLine();
      setOverrideLine('');
    }
  }, [user, isDialModalOpen]);

  const handleDial = async () => {
    if (!pendingDial) return;

    await initiateCall({
      ...pendingDial,
      linePhoneNumber: overrideLine.trim() || defaultLine || undefined,
    });
  };

  const goToSettings = () => {
    closeDialModal();
    navigate('/settings');
  };

  if (!pendingDial) return null;

  const hasLineConfigured = defaultLine || overrideLine.trim();

  return (
    <Dialog open={isDialModalOpen} onOpenChange={(open) => !open && closeDialModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Initiate Call
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Contact Info */}
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-lg font-semibold">
              {pendingDial.contactName || 'Unknown Contact'}
            </p>
            {pendingDial.companyName && (
              <p className="text-sm text-muted-foreground">{pendingDial.companyName}</p>
            )}
            <p className="text-xl font-mono mt-2 text-primary">
              {pendingDial.phoneNumber}
            </p>
          </div>

          {/* Line Configuration */}
          {isLoadingLine ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !defaultLine ? (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
                  No default outbound line configured
                </p>
                <p className="text-xs text-muted-foreground">
                  Please configure your default Aloware line in Settings, or enter a line number below.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="override-line">Outbound Line Number</Label>
                <Input
                  id="override-line"
                  placeholder="+1XXXXXXXXXX"
                  value={overrideLine}
                  onChange={(e) => setOverrideLine(e.target.value)}
                />
              </div>

              <Button variant="outline" className="w-full" onClick={goToSettings}>
                <Settings className="mr-2 h-4 w-4" />
                Go to Settings
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Outbound Line</Label>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="font-mono text-sm">{defaultLine}</p>
                <p className="text-xs text-muted-foreground mt-1">Your default Aloware line</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={closeDialModal}
              disabled={isDialing}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleDial}
              disabled={isDialing || !hasLineConfigured}
            >
              {isDialing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" />
                  Dial Now
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
