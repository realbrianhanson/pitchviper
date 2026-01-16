import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, HelpCircle, User, Wrench, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const alertTypes = [
  {
    id: "objection",
    label: "Stuck on objection",
    description: "Need help handling a tough objection",
    icon: HelpCircle,
    color: "text-warning",
  },
  {
    id: "manager",
    label: "Need manager",
    description: "Request manager intervention",
    icon: User,
    color: "text-primary",
  },
  {
    id: "technical",
    label: "Technical issue",
    description: "System or tool problem",
    icon: Wrench,
    color: "text-destructive",
  },
  {
    id: "other",
    label: "Other",
    description: "Something else",
    icon: MessageSquare,
    color: "text-muted-foreground",
  },
];

export function SOSModal({ isOpen, onClose }: SOSModalProps) {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType || !user) return;

    setIsSubmitting(true);

    try {
      // Get user's team
      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("user_id", user.id)
        .single();

      const { error } = await supabase.from("sos_alerts").insert({
        user_id: user.id,
        team_id: profile?.team_id || null,
        alert_type: selectedType,
        note: note.trim() || null,
        status: "pending",
      });

      if (error) throw error;

      toast.success("SOS sent! Help is on the way.", {
        duration: 4000,
      });

      // Reset and close
      setSelectedType(null);
      setNote("");
      onClose();
    } catch (error) {
      console.error("Error sending SOS:", error);
      toast.error("Failed to send SOS. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-destructive/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Need Backup?
          </DialogTitle>
          <DialogDescription>
            What's happening? Your manager will be notified immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Alert Type Selection */}
          <div className="grid grid-cols-2 gap-3">
            {alertTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all",
                    selectedType === type.id
                      ? "border-primary bg-primary/10 ring-2 ring-primary"
                      : "border-border/50 bg-background/50 hover:border-primary/50"
                  )}
                >
                  <Icon className={cn("h-6 w-6", type.color)} />
                  <span className="font-medium text-sm text-foreground">{type.label}</span>
                  <span className="text-xs text-muted-foreground text-center">
                    {type.description}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Optional Note */}
          <div className="space-y-2">
            <Label htmlFor="note" className="text-muted-foreground">
              Additional details (optional)
            </Label>
            <Textarea
              id="note"
              placeholder="What's the situation? Add context here..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none bg-background/50"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!selectedType || isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4" />
                Send SOS
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
