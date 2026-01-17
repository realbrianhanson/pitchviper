import { useState } from 'react';
import { MessageSquare, X, Loader2, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useClickToDial } from '@/hooks/useClickToDial';

const SMS_TEMPLATES = [
  { label: 'Follow Up', text: "Hi! Following up on our conversation. Do you have any questions I can help with?" },
  { label: 'Thanks', text: "Thanks for your time today! Let me know if you have any questions." },
  { label: 'Missed Call', text: "Just tried calling - is there a better time to connect?" },
  { label: 'Meeting Reminder', text: "Looking forward to our meeting! Let me know if you need to reschedule." },
];

const MAX_SMS_LENGTH = 160;

export function SendSMSModal() {
  const { 
    isSMSModalOpen, 
    closeSMSModal, 
    pendingSMS, 
    isSendingSMS, 
    sendSMS 
  } = useClickToDial();
  
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    if (!pendingSMS || !message.trim()) return;
    
    const result = await sendSMS(pendingSMS.phoneNumber, message, pendingSMS.contactName, pendingSMS.dealId);
    if (result.success) {
      setMessage('');
    }
  };

  const handleTemplateClick = (text: string) => {
    setMessage(text);
  };

  const handleClose = () => {
    setMessage('');
    closeSMSModal();
  };

  if (!pendingSMS) return null;

  const charCount = message.length;
  const isOverLimit = charCount > MAX_SMS_LENGTH;
  const segmentCount = Math.ceil(charCount / MAX_SMS_LENGTH) || 1;

  return (
    <Dialog open={isSMSModalOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Send SMS
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Contact Info */}
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-lg font-semibold">
              {pendingSMS.contactName || 'Unknown Contact'}
            </p>
            {pendingSMS.companyName && (
              <p className="text-sm text-muted-foreground">{pendingSMS.companyName}</p>
            )}
            <p className="text-xl font-mono mt-2 text-primary">
              {pendingSMS.phoneNumber}
            </p>
          </div>

          {/* Quick Templates */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Quick templates:</p>
            <div className="flex flex-wrap gap-2">
              {SMS_TEMPLATES.map((template) => (
                <Badge
                  key={template.label}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => handleTemplateClick(template.text)}
                >
                  {template.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Message Input */}
          <div className="space-y-2">
            <Textarea
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className={isOverLimit ? 'text-amber-500' : ''}>
                {charCount}/{MAX_SMS_LENGTH} characters
              </span>
              {segmentCount > 1 && (
                <span className="text-amber-500">
                  {segmentCount} message segments
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={isSendingSMS}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSend}
              disabled={isSendingSMS || !message.trim()}
            >
              {isSendingSMS ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send SMS
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
