import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Users, ClipboardList } from "lucide-react";
import { ViperButton } from "@/components/ui/viper-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

export function ManagerQuickActions() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [competitionOpen, setCompetitionOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [competitionName, setCompetitionName] = useState('');
  const [competitionDesc, setCompetitionDesc] = useState('');
  const [competitionMetric, setCompetitionMetric] = useState('calls');
  const [competitionDays, setCompetitionDays] = useState('7');
  const [competitionPrize, setCompetitionPrize] = useState('');

  const resetCompetitionForm = () => {
    setCompetitionName('');
    setCompetitionDesc('');
    setCompetitionMetric('calls');
    setCompetitionDays('7');
    setCompetitionPrize('');
  };

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

      setCompetitionOpen(false);
      resetCompetitionForm();
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

  return (
    <>
      <div className="grid grid-cols-2 gap-2 w-full md:flex md:flex-wrap md:w-auto sm:gap-3">
        <ViperButton onClick={() => setCompetitionOpen(true)} className="col-span-2 w-full md:w-auto">
          <Trophy className="h-4 w-4 mr-2" />
          Start Competition
        </ViperButton>
        <ViperButton variant="outline" onClick={() => navigate('/coaching')} className="w-full md:w-auto">
          <ClipboardList className="h-4 w-4 mr-2" />
          Open Coaching
        </ViperButton>
        <ViperButton variant="outline" onClick={() => navigate('/team-settings')} className="w-full md:w-auto">
          <Users className="h-4 w-4 mr-2" />
          Manage Team
        </ViperButton>
      </div>

      <Dialog open={competitionOpen} onOpenChange={setCompetitionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Start Team Competition
            </DialogTitle>
            <DialogDescription>
              Set a metric, duration, and prize to launch a team-wide competition.
            </DialogDescription>
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
            <ViperButton variant="outline" onClick={() => setCompetitionOpen(false)}>
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
    </>
  );
}
