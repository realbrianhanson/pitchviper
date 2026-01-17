import { useState } from 'react';
import { Phone, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClickToDial } from '@/hooks/useClickToDial';

// Mock available lines - in production, these would come from Aloware API
const AVAILABLE_LINES = [
  { id: 'default', label: 'Default Line', number: '' },
  { id: 'line1', label: 'Sales Line 1', number: '+1-555-0100' },
  { id: 'line2', label: 'Sales Line 2', number: '+1-555-0101' },
  { id: 'line3', label: 'Support Line', number: '+1-555-0102' },
];

export function DialModal() {
  const { 
    isDialModalOpen, 
    closeDialModal, 
    pendingDial, 
    isDialing, 
    initiateCall 
  } = useClickToDial();
  
  const [selectedLine, setSelectedLine] = useState('default');

  const handleDial = async () => {
    if (!pendingDial) return;

    const line = AVAILABLE_LINES.find(l => l.id === selectedLine);
    
    await initiateCall({
      ...pendingDial,
      linePhoneNumber: line?.number || undefined,
    });
  };

  if (!pendingDial) return null;

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

          {/* Line Selection */}
          <div className="space-y-2">
            <Label htmlFor="line-select">Outbound Line</Label>
            <Select value={selectedLine} onValueChange={setSelectedLine}>
              <SelectTrigger id="line-select">
                <SelectValue placeholder="Select a line" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_LINES.map((line) => (
                  <SelectItem key={line.id} value={line.id}>
                    {line.label}
                    {line.number && (
                      <span className="text-muted-foreground ml-2">({line.number})</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select which phone line to use for this call
            </p>
          </div>

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
              disabled={isDialing}
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
