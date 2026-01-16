import { useState, useEffect } from "react";
import { Trophy, Clock, Users, ChevronRight, Flag } from "lucide-react";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { ViperBadge } from "@/components/ui/viper-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Competition, CompetitionParticipant, useCompetitions } from "@/hooks/useCompetitions";
import { formatDistanceToNow, differenceInSeconds, format } from "date-fns";

interface ActiveCompetitionsProps {
  competitions: Competition[];
  onViewDetails: (competition: Competition) => void;
  onEndCompetition: (competitionId: string) => void;
}

const metricLabels: Record<string, string> = {
  calls: 'Most Calls',
  appointments: 'Most Appointments',
  revenue: 'Highest Revenue',
  deals: 'Most Deals',
  roleplay: 'Best Roleplay Score',
  custom: 'Custom Metric',
};

function CountdownTimer({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const end = new Date(endDate);
      const now = new Date();
      const diff = differenceInSeconds(end, now);

      if (diff <= 0) {
        setTimeLeft('Ended');
        return;
      }

      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <span className={timeLeft === 'Ended' ? 'text-destructive' : 'text-primary font-mono'}>
      {timeLeft}
    </span>
  );
}

function CompetitionCard({ 
  competition, 
  onViewDetails, 
  onEndCompetition 
}: { 
  competition: Competition;
  onViewDetails: (competition: Competition) => void;
  onEndCompetition: (competitionId: string) => void;
}) {
  const { getCompetitionStandings } = useCompetitions();
  const [leader, setLeader] = useState<CompetitionParticipant | null>(null);
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    const fetchLeader = async () => {
      const standings = await getCompetitionStandings(competition.id);
      setParticipantCount(standings.length);
      if (standings.length > 0) {
        setLeader(standings[0]);
      }
    };
    fetchLeader();
  }, [competition.id]);

  const isActive = competition.status === 'active';
  const isUpcoming = competition.status === 'upcoming';

  return (
    <ViperCard variant="glass" className="hover:border-primary/30 transition-all">
      <ViperCardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isActive ? 'bg-success/20' : 'bg-primary/20'}`}>
              <Trophy className={`h-5 w-5 ${isActive ? 'text-success' : 'text-primary'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{competition.name}</h3>
              <p className="text-sm text-muted-foreground">{competition.description}</p>
            </div>
          </div>
          <ViperBadge variant={isActive ? 'success' : 'default'}>
            {isActive ? 'Active' : 'Upcoming'}
          </ViperBadge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Metric</p>
            <p className="text-sm font-medium">{metricLabels[competition.metric_type]}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Time Remaining</p>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <CountdownTimer endDate={competition.end_date} />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Participants</p>
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{participantCount}</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Winners</p>
            <p className="text-sm font-medium">Top {competition.number_of_winners}</p>
          </div>
        </div>

        {leader && isActive && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20 mb-4">
            <Avatar className="h-8 w-8">
              <AvatarImage src={leader.profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-success/20 text-success text-xs">
                {leader.profile?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium text-success">Current Leader</p>
              <p className="text-xs text-muted-foreground">{leader.profile?.full_name}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-success">
                {competition.metric_type === 'revenue' ? `$${leader.current_value.toLocaleString()}` : leader.current_value}
              </p>
            </div>
          </div>
        )}

        {competition.prize_description && (
          <div className="flex items-center gap-2 p-2 rounded bg-primary/10 border border-primary/20 text-sm mb-4">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-primary">{competition.prize_description}</span>
            {competition.prize_value && (
              <ViperBadge variant="success" size="sm">${competition.prize_value}</ViperBadge>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <ViperButton 
            variant="outline" 
            className="flex-1"
            onClick={() => onViewDetails(competition)}
          >
            View Details
            <ChevronRight className="h-4 w-4 ml-1" />
          </ViperButton>
          {isActive && (
            <ViperButton 
              variant="destructive" 
              size="sm"
              onClick={() => onEndCompetition(competition.id)}
            >
              <Flag className="h-4 w-4 mr-1" />
              End Early
            </ViperButton>
          )}
        </div>
      </ViperCardContent>
    </ViperCard>
  );
}

export function ActiveCompetitions({ competitions, onViewDetails, onEndCompetition }: ActiveCompetitionsProps) {
  if (competitions.length === 0) {
    return (
      <ViperCard>
        <ViperCardHeader>
          <ViperCardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Active Competitions
          </ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Trophy className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No Active Competitions</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Create a new competition to motivate your team and drive performance!
            </p>
          </div>
        </ViperCardContent>
      </ViperCard>
    );
  }

  const active = competitions.filter(c => c.status === 'active');
  const upcoming = competitions.filter(c => c.status === 'upcoming');

  return (
    <div className="space-y-6">
      {active.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            Active Now ({active.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {active.map(competition => (
              <CompetitionCard 
                key={competition.id} 
                competition={competition}
                onViewDetails={onViewDetails}
                onEndCompetition={onEndCompetition}
              />
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">
            Upcoming ({upcoming.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {upcoming.map(competition => (
              <CompetitionCard 
                key={competition.id} 
                competition={competition}
                onViewDetails={onViewDetails}
                onEndCompetition={onEndCompetition}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
