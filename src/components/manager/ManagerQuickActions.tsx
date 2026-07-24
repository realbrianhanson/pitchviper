import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Users, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        title: 'Competition created',
        description: `${competitionName} is now live.`,
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
      <div className="flex flex-wrap gap-2 w-full lg:w-auto">
        <Button
          onClick={() => setCompetitionOpen(true)}
          className="min-h-[40px] flex-1 lg:flex-none"
        >
          <Trophy className="h-4 w-4 mr-2" />
          Start competition
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/coaching')}
          className="min-h-[40px] flex-1 lg:flex-none"
        >
          <ClipboardList className="h-4 w-4 mr-2" />
          Open coaching
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/team-settings')}
          className="min-h-[40px] flex-1 lg:flex-none"
        >
          <Users className="h-4 w-4 mr-2" />
          Manage team
        </Button>
      </div>

      <Dialog open={competitionOpen} onOpenChange={setCompetitionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Start team competition
            </DialogTitle>
            <DialogDescription>
              Set a metric, duration, and prize to launch a team-wide competition.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Competition name</Label>
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
                    <SelectItem value="calls">Most calls</SelectItem>
                    <SelectItem value="appointments">Most appointments</SelectItem>
                    <SelectItem value="revenue">Highest revenue</SelectItem>
                    <SelectItem value="roleplay">Best roleplay score</SelectItem>
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
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">1 week</SelectItem>
                    <SelectItem value="14">2 weeks</SelectItem>
                    <SelectItem value="30">1 month</SelectItem>
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
            <Button variant="outline" onClick={() => setCompetitionOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCompetition}
              disabled={!competitionName || !competitionDesc || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Launch competition'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
