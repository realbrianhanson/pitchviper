import { Phone, X, ExternalLink, ClipboardList } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useClickToDial } from '@/hooks/useClickToDial';

/**
 * Neutral dial modal. There is no verified in-app telephony adapter, so
 * we present a truthful choice: hand off to the external phone system
 * (Dialer.io) or log a call manually. No provider credentials are
 * touched from this component.
 */
export function DialModal() {
  const {
    isDialModalOpen,
    closeDialModal,
    pendingDial,
    isDialing,
    initiateCall,
    openManualLog,
  } = useClickToDial();

  if (!pendingDial) return null;

  const handleOpenDialer = () => {
    void initiateCall({ ...pendingDial });
  };

  const handleLogManually = () => {
    // Snapshot the pending details before we close the dial dialog so we
    // can hand them to LogCallModal without racing state resets.
    const initial = {
      contactName: pendingDial.contactName ?? '',
      companyName: pendingDial.companyName ?? '',
      phoneNumber: pendingDial.phoneNumber,
      direction: 'outbound' as const,
    };
    closeDialModal();
    // Defer opening the second dialog by a frame so Radix can release focus
    // from the first one — prevents nested-dialog focus-trap warnings.
    setTimeout(() => openManualLog(initial), 0);
  };


  return (
    <Dialog open={isDialModalOpen} onOpenChange={(open) => !open && closeDialModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Phone className="h-4 w-4 text-primary" />
            Call {pendingDial.contactName || 'contact'}
          </DialogTitle>
          <DialogDescription className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            External phone system
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="border border-border bg-background/40 p-4 space-y-1">
            <p className="font-display text-lg leading-tight">
              {pendingDial.contactName || 'Unknown contact'}
            </p>
            {pendingDial.companyName && (
              <p className="text-xs text-muted-foreground">{pendingDial.companyName}</p>
            )}
            <p className="font-mono text-sm text-primary mt-2">{pendingDial.phoneNumber}</p>
          </div>

          <p className="text-sm text-muted-foreground">
            PitchViper hands the dial off to your phone system, then keeps coaching, deals
            and streaks in sync when you log the outcome.
          </p>

          <div className="flex flex-col gap-2">
            <Button className="w-full gap-2" onClick={handleOpenDialer} disabled={isDialing}>
              <ExternalLink className="h-4 w-4" />
              Open in phone system
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={closeDialModal}>
              <ClipboardList className="h-4 w-4" />
              Log call manually
            </Button>
            <Button variant="ghost" className="w-full gap-2" onClick={closeDialModal}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
