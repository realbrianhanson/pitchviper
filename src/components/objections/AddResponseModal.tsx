import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ResponseApproach } from "@/hooks/useObjections";
import { MessageSquare, Loader2, Brain, Lightbulb, ArrowRight, HelpCircle, Users } from "lucide-react";
import { toast } from "sonner";

interface AddResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  objectionText?: string;
  onAdd: (data: {
    response_text: string;
    approach: ResponseApproach;
  }) => Promise<boolean | undefined>;
}

const approaches: { value: ResponseApproach; label: string; description: string; icon: React.ReactNode }[] = [
  { 
    value: 'empathy', 
    label: 'Empathy', 
    description: 'Show understanding and relate to their concern',
    icon: <Brain className="h-4 w-4" />
  },
  { 
    value: 'logic', 
    label: 'Logic', 
    description: 'Use facts, data, and rational arguments',
    icon: <Lightbulb className="h-4 w-4" />
  },
  { 
    value: 'redirect', 
    label: 'Redirect', 
    description: 'Shift focus to a different angle or benefit',
    icon: <ArrowRight className="h-4 w-4" />
  },
  { 
    value: 'question', 
    label: 'Question', 
    description: 'Dig deeper to understand the real concern',
    icon: <HelpCircle className="h-4 w-4" />
  },
  { 
    value: 'social_proof', 
    label: 'Social Proof', 
    description: 'Reference other customers or success stories',
    icon: <Users className="h-4 w-4" />
  }
];

export function AddResponseModal({ isOpen, onClose, objectionText, onAdd }: AddResponseModalProps) {
  const [responseText, setResponseText] = useState('');
  const [approach, setApproach] = useState<ResponseApproach | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!responseText.trim() || !approach) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    const success = await onAdd({
      response_text: responseText.trim(),
      approach
    });

    if (success) {
      toast.success('Response added successfully!');
      setResponseText('');
      setApproach('');
      onClose();
    } else {
      toast.error('Failed to add response');
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <MessageSquare className="h-5 w-5 text-primary" />
            Add Your Response
          </DialogTitle>
        </DialogHeader>

        {objectionText && (
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <p className="text-sm text-muted-foreground">Responding to:</p>
            <p className="text-foreground font-medium">"{objectionText}"</p>
          </div>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="response-text">Your Response *</Label>
            <Textarea
              id="response-text"
              placeholder="Write your battle-tested response..."
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              className="bg-background border-border min-h-[120px]"
            />
          </div>

          <div className="space-y-3">
            <Label>Approach *</Label>
            <RadioGroup 
              value={approach} 
              onValueChange={(value) => setApproach(value as ResponseApproach)}
              className="space-y-2"
            >
              {approaches.map(app => (
                <div 
                  key={app.value}
                  className="flex items-start space-x-3 p-3 rounded-lg border border-border/50 hover:border-primary/50 transition-colors"
                >
                  <RadioGroupItem
                    value={app.value}
                    id={`approach-${app.value}`}
                    className="mt-0.5 border-border text-primary"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={`approach-${app.value}`}
                      className="flex items-center gap-2 cursor-pointer text-foreground"
                    >
                      {app.icon}
                      {app.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {app.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Response
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
