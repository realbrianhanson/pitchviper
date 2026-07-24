import { useState } from "react";
import { Megaphone, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ViperButton } from "@/components/ui/viper-button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface BroadcastModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BROADCAST_TYPES = [
  { value: "announcement", label: "📢 Announcement" },
  { value: "motivation", label: "🔥 Motivation" },
  { value: "reminder", label: "⏰ Reminder" },
  { value: "celebration", label: "🎉 Celebration" },
];

export function BroadcastModal({ open, onOpenChange }: BroadcastModalProps) {
  const { user, profile } = useAuth();
  const [message, setMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState("announcement");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || !user || !profile?.team_id) return;

    setIsSending(true);
    try {
      // Insert broadcast
      const { error: broadcastError } = await supabase
        .from("team_broadcasts")
        .insert([{
          team_id: profile.team_id,
          sender_id: user.id,
          message: message.trim(),
          broadcast_type: broadcastType
        }]);

      if (broadcastError) throw broadcastError;

      // Get all team members to notify
      const { data: teamMembers } = await supabase
        .from("team_profiles_safe")
        .select("user_id")
        .eq("team_id", profile.team_id)
        .neq("user_id", user.id);

      // Create notifications for each team member
      if (teamMembers && teamMembers.length > 0) {
        for (const member of teamMembers) {
          await supabase.functions.invoke("create-notification", {
            body: {
              user_id: member.user_id,
              type: "mentioned",
              title: `📢 Team Broadcast from ${profile.full_name}`,
              body: message.trim().substring(0, 100),
              action_url: "/"
            }
          });
        }
      }

      toast.success("Broadcast sent to team!");
      setMessage("");
      setBroadcastType("announcement");
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending broadcast:", error);
      toast.error("Failed to send broadcast");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Send Team Broadcast
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Broadcast Type</Label>
            <Select value={broadcastType} onValueChange={setBroadcastType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BROADCAST_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message to the team..."
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <ViperButton
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </ViperButton>
          <ViperButton
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {isSending ? "Sending..." : "Send Broadcast"}
          </ViperButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
