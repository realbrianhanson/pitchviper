import { useState } from "react";
import { Trophy, Award, Heart, Zap, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ViperButton } from "@/components/ui/viper-button";
import { ViperInput } from "@/components/ui/viper-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TeamMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface GiveKudosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMembers: TeamMember[];
  onSendKudos: (recipientId: string, kudosType: string, note?: string) => void;
  currentUserId?: string;
}

const KUDOS_TYPES = [
  { value: "Great Close", label: "Great Close", icon: Trophy, color: "text-amber-500" },
  { value: "Helpful", label: "Helpful", icon: Heart, color: "text-pink-500" },
  { value: "Crushing It", label: "Crushing It", icon: Zap, color: "text-primary" },
  { value: "Team Player", label: "Team Player", icon: Users, color: "text-blue-500" },
];

export function GiveKudosModal({ 
  open, 
  onOpenChange, 
  teamMembers, 
  onSendKudos,
  currentUserId 
}: GiveKudosModalProps) {
  const [selectedMember, setSelectedMember] = useState("");
  const [selectedKudosType, setSelectedKudosType] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedMember || !selectedKudosType) return;

    setIsSubmitting(true);
    await onSendKudos(selectedMember, selectedKudosType, note || undefined);
    setIsSubmitting(false);
    
    // Reset form
    setSelectedMember("");
    setSelectedKudosType("");
    setNote("");
    onOpenChange(false);
  };

  // Filter out current user from team members
  const eligibleMembers = teamMembers.filter(m => m.user_id !== currentUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Give Kudos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Select team member */}
          <div className="space-y-2">
            <Label>Who deserves recognition?</Label>
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger>
                <SelectValue placeholder="Select a team member" />
              </SelectTrigger>
              <SelectContent>
                {eligibleMembers.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    <div className="flex items-center gap-2">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.full_name}
                          className="h-5 w-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">
                            {member.full_name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span>{member.full_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Select kudos type */}
          <div className="space-y-2">
            <Label>What kind of kudos?</Label>
            <div className="grid grid-cols-2 gap-2">
              {KUDOS_TYPES.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedKudosType(value)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border transition-all",
                    selectedKudosType === value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-accent"
                  )}
                >
                  <Icon className={cn("h-5 w-5", color)} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Optional note */}
          <div className="space-y-2">
            <Label>Add a note (optional)</Label>
            <ViperInput
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did they do that was awesome?"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <ViperButton
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </ViperButton>
          <ViperButton
            onClick={handleSubmit}
            disabled={!selectedMember || !selectedKudosType || isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send Kudos 🎉"}
          </ViperButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
