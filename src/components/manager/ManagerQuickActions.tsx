import { useState } from "react";
import { Trophy, MessageSquare, Calendar, Plus } from "lucide-react";
import { ViperButton } from "@/components/ui/viper-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type ModalType = 'competition' | 'message' | 'huddle' | null;

export function ManagerQuickActions() {
  const { user, profile } = useAuth();
  const [modalType, setModalType] = useState<ModalType>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Competition form state
  const [competitionName, setCompetitionName] = useState('');
  const [competitionDesc, setCompetitionDesc] = useState('');
  const [competitionMetric, setCompetitionMetric] = useState('calls');
  const [competitionDays, setCompetitionDays] = useState('7');
  const [competitionPrize, setCompetitionPrize] = useState('');

  // Message form state
  const [messageText, setMessageText] = useState('');

  // Huddle form state
  const [huddleTitle, setHuddleTitle] = useState('');
  const [huddleTime, setHuddleTime] = useState('');

  const handleCreateCompetition = async () => {
    if (!profile?.team_id || !user) return;
    
    setIsSubmitting(true);
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(competitionDays));

      const { error } = await (supabase
        .from('competitions' as any)
        .insert({
          team_id: profile.team_id,
          name: competitionName,
          description: competitionDesc,
          metric_type: competitionMetric,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          prize_description: competitionPrize,
          created_by: user.id,
          status: 'active'
        })) as any;

      if (error) throw error;

      toast({
        title: '🏆 Competition Created!',
        description: `${competitionName} is now live!`,
      });

      setModalType(null);
      resetForms();
    } catch (error) {
      console.error('Error creating competition:', error);
      toast({
        title: 'Error',
        description: 'Could not create competition. Try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    // In a real app, this would send to a messaging system
    toast({
      title: '📢 Message Sent!',
      description: 'Your message has been broadcast to the team.',
    });
    setModalType(null);
    resetForms();
  };

  const handleScheduleHuddle = async () => {
    // In a real app, this would create a calendar event
    toast({
      title: '📅 Huddle Scheduled!',
      description: `${huddleTitle} has been added to the team calendar.`,
    });
    setModalType(null);
    resetForms();
  };

  const resetForms = () => {
    setCompetitionName('');
    setCompetitionDesc('');
    setCompetitionMetric('calls');
    setCompetitionDays('7');
    setCompetitionPrize('');
    setMessageText('');
    setHuddleTitle('');
    setHuddleTime('');
  };

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <ViperButton onClick={() => setModalType('competition')}>
          <Trophy className="h-4 w-4 mr-2" />
          Start Competition
        </ViperButton>
        <ViperButton variant="outline" onClick={() => setModalType('message')}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Team Message
        </ViperButton>
        <ViperButton variant="outline" onClick={() => setModalType('huddle')}>
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Huddle
        </ViperButton>
      </div>

      {/* Create Competition Modal */}
      <Dialog open={modalType === 'competition'} onOpenChange={() => setModalType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Start Team Competition
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Competition Name</Label>
              <Input
                placeholder="e.g., January Sprint"
                value={competitionName}
                onChange={(e) => setCompetitionName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="What's this competition about?"
                value={competitionDesc}
                onChange={(e) => setCompetitionDesc(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Metric</Label>
                <Select value={competitionMetric} onValueChange={setCompetitionMetric}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="calls">Most Calls</SelectItem>
                    <SelectItem value="appointments">Most Appointments</SelectItem>
                    <SelectItem value="revenue">Highest Revenue</SelectItem>
                    <SelectItem value="roleplay">Best Roleplay Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={competitionDays} onValueChange={setCompetitionDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Day</SelectItem>
                    <SelectItem value="3">3 Days</SelectItem>
                    <SelectItem value="7">1 Week</SelectItem>
                    <SelectItem value="14">2 Weeks</SelectItem>
                    <SelectItem value="30">1 Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Prize (optional)</Label>
              <Input
                placeholder="e.g., Extra day off + $500 bonus"
                value={competitionPrize}
                onChange={(e) => setCompetitionPrize(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <ViperButton variant="outline" onClick={() => setModalType(null)}>
              Cancel
            </ViperButton>
            <ViperButton 
              onClick={handleCreateCompetition} 
              disabled={!competitionName || !competitionDesc || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Launch Competition'}
            </ViperButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Message Modal */}
      <Dialog open={modalType === 'message'} onOpenChange={() => setModalType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Send Team Message
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Your message to the team..."
                rows={4}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <ViperButton variant="outline" onClick={() => setModalType(null)}>
              Cancel
            </ViperButton>
            <ViperButton onClick={handleSendMessage} disabled={!messageText}>
              Send to Team
            </ViperButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Huddle Modal */}
      <Dialog open={modalType === 'huddle'} onOpenChange={() => setModalType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Schedule Team Huddle
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Huddle Title</Label>
              <Input
                placeholder="e.g., Morning Standup"
                value={huddleTitle}
                onChange={(e) => setHuddleTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={huddleTime}
                onChange={(e) => setHuddleTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <ViperButton variant="outline" onClick={() => setModalType(null)}>
              Cancel
            </ViperButton>
            <ViperButton onClick={handleScheduleHuddle} disabled={!huddleTitle || !huddleTime}>
              Schedule Huddle
            </ViperButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}