import { useState, useEffect } from "react";
import { Trophy, Clock, Users, Medal, TrendingUp, TrendingDown, Minus, Flag, X, Crown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ViperButton } from "@/components/ui/viper-button";
import { ViperBadge } from "@/components/ui/viper-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Competition, CompetitionParticipant, CompetitionActivity, useCompetitions } from "@/hooks/useCompetitions";
import { formatDistanceToNow, differenceInSeconds, format } from "date-fns";

interface CompetitionDetailModalProps {
  competition: Competition | null;
  open: boolean;
  onClose: () => void;
  onEndCompetition: (id: string) => void;
}

const metricLabels: Record<string, string> = {
  calls: 'Calls',
  appointments: 'Appointments',
  revenue: 'Revenue',
  deals: 'Deals',
  roleplay: 'Score',
  custom: 'Points',
};

function CountdownDisplay({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateTimer = () => {
      const end = new Date(endDate);
      const now = new Date();
      const diff = differenceInSeconds(end, now);

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / 86400),
        hours: Math.floor((diff % 86400) / 3600),
        minutes: Math.floor((diff % 3600) / 60),
        seconds: diff % 60
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <div className="flex items-center justify-center gap-3 py-4">
      {[
        { value: timeLeft.days, label: 'Days' },
        { value: timeLeft.hours, label: 'Hours' },
        { value: timeLeft.minutes, label: 'Mins' },
        { value: timeLeft.seconds, label: 'Secs' },
      ].map((unit, i) => (
        <div key={i} className="text-center">
          <div className="text-3xl font-mono font-bold text-primary bg-primary/10 rounded-lg px-3 py-2 min-w-[60px]">
            {unit.value.toString().padStart(2, '0')}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{unit.label}</p>
        </div>
      ))}
    </div>
  );
}

function LeaderboardRow({ 
  participant, 
  rank, 
  metricType,
  isLeader
}: { 
  participant: CompetitionParticipant; 
  rank: number;
  metricType: string;
  isLeader: boolean;
}) {
  const getRankStyle = () => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/50';
      case 2: return 'bg-gradient-to-r from-slate-400/20 to-slate-300/20 border-slate-400/50';
      case 3: return 'bg-gradient-to-r from-orange-600/20 to-orange-500/20 border-orange-500/50';
      default: return 'border-border';
    }
  };

  const getRankBadge = () => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-slate-400" />;
      case 3: return <Medal className="h-5 w-5 text-orange-500" />;
      default: return <span className="text-lg font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const formatValue = (value: number) => {
    if (metricType === 'revenue') {
      return `$${value.toLocaleString()}`;
    }
    return value.toLocaleString();
  };

  return (
    <div className={`flex items-center gap-4 p-3 rounded-lg border ${getRankStyle()} transition-all`}>
      <div className="w-8 flex justify-center">
        {getRankBadge()}
      </div>
      <Avatar className="h-10 w-10">
        <AvatarImage src={participant.profile?.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/20 text-primary text-sm">
          {participant.profile?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="font-medium">{participant.profile?.full_name || 'Unknown'}</p>
        <p className="text-xs text-muted-foreground">Level {participant.profile?.current_level || 1}</p>
      </div>
      <div className="text-right">
        <p className={`text-lg font-bold ${rank <= 3 ? 'text-primary' : ''}`}>
          {formatValue(participant.current_value)}
        </p>
        <p className="text-xs text-muted-foreground">{metricLabels[metricType]}</p>
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: CompetitionActivity }) {
  const getActivityIcon = () => {
    switch (activity.activity_type) {
      case 'new_leader':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'rank_change':
        if (activity.new_rank && activity.previous_rank) {
          return activity.new_rank < activity.previous_rank 
            ? <TrendingUp className="h-4 w-4 text-success" />
            : <TrendingDown className="h-4 w-4 text-destructive" />;
        }
        return <Minus className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Trophy className="h-4 w-4 text-primary" />;
    }
  };

  const getActivityText = () => {
    switch (activity.activity_type) {
      case 'new_leader':
        return `${activity.profile?.full_name} took the lead!`;
      case 'rank_change':
        if (activity.new_rank && activity.previous_rank) {
          const change = activity.previous_rank - activity.new_rank;
          return `${activity.profile?.full_name} moved ${change > 0 ? 'up' : 'down'} to #${activity.new_rank}`;
        }
        return `${activity.profile?.full_name} updated their position`;
      default:
        return `${activity.profile?.full_name} joined the competition`;
    }
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="p-1.5 rounded-full bg-muted">
        {getActivityIcon()}
      </div>
      <div className="flex-1">
        <p className="text-sm">{getActivityText()}</p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

export function CompetitionDetailModal({ 
  competition, 
  open, 
  onClose, 
  onEndCompetition 
}: CompetitionDetailModalProps) {
  const { getCompetitionStandings, getCompetitionActivity } = useCompetitions();
  const [standings, setStandings] = useState<CompetitionParticipant[]>([]);
  const [activity, setActivity] = useState<CompetitionActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!competition) return;
      setIsLoading(true);
      const [standingsData, activityData] = await Promise.all([
        getCompetitionStandings(competition.id),
        getCompetitionActivity(competition.id)
      ]);
      setStandings(standingsData);
      setActivity(activityData);
      setIsLoading(false);
    };

    if (open && competition) {
      fetchData();
    }
  }, [open, competition]);

  if (!competition) return null;

  const isActive = competition.status === 'active';
  const isCompleted = competition.status === 'completed';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isActive ? 'bg-success/20' : isCompleted ? 'bg-muted' : 'bg-primary/20'}`}>
                <Trophy className={`h-6 w-6 ${isActive ? 'text-success' : isCompleted ? 'text-muted-foreground' : 'text-primary'}`} />
              </div>
              <div>
                <DialogTitle className="text-xl">{competition.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">{competition.description}</p>
              </div>
            </div>
            <ViperBadge variant={isActive ? 'success' : isCompleted ? 'secondary' : 'default'}>
              {competition.status}
            </ViperBadge>
          </div>
        </DialogHeader>

        {isActive && (
          <CountdownDisplay endDate={competition.end_date} />
        )}

        {isCompleted && (
          <div className="text-center py-4">
            <p className="text-muted-foreground">Competition ended</p>
            <p className="font-medium">{format(new Date(competition.end_date), 'PPP')}</p>
          </div>
        )}

        <Tabs defaultValue="standings" className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="standings">
              <Trophy className="h-4 w-4 mr-2" />
              Standings
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Clock className="h-4 w-4 mr-2" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="standings" className="mt-4">
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-muted-foreground">Loading standings...</p>
                  </div>
                ) : standings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No participants yet</p>
                  </div>
                ) : (
                  standings.map((participant, index) => (
                    <LeaderboardRow
                      key={participant.id}
                      participant={participant}
                      rank={index + 1}
                      metricType={competition.metric_type}
                      isLeader={index === 0}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <ScrollArea className="h-[350px] pr-4">
              {activity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No activity yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {activity.map((item) => (
                    <ActivityItem key={item.id} activity={item} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {isActive && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <ViperButton variant="outline" onClick={onClose}>
              Close
            </ViperButton>
            <ViperButton 
              variant="destructive"
              onClick={() => {
                onEndCompetition(competition.id);
                onClose();
              }}
            >
              <Flag className="h-4 w-4 mr-2" />
              End Competition
            </ViperButton>
          </div>
        )}

        {!isActive && (
          <div className="flex justify-end pt-4 border-t">
            <ViperButton variant="outline" onClick={onClose}>
              Close
            </ViperButton>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
