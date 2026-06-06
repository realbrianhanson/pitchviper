import { Link } from "react-router-dom";
import { Trophy, Clock, Gift, Plus } from "lucide-react";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { ViperBadge } from "@/components/ui/viper-badge";
import { ViperButton } from "@/components/ui/viper-button";
import { Competition } from "@/hooks/useLeaderboard";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow, format } from "date-fns";

interface CompetitionsPanelProps {
  competitions: Competition[];
}

const metricLabels: Record<string, string> = {
  calls: 'Most Calls',
  appointments: 'Most Appointments',
  revenue: 'Highest Revenue',
  roleplay: 'Best Roleplay Score',
  custom: 'Custom Metric',
};

export function CompetitionsPanel({ competitions }: CompetitionsPanelProps) {
  const { isManager } = useAuth();

  if (competitions.length === 0) {
    return (
      <ViperCard>
        <ViperCardHeader>
          <ViperCardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Competitions
          </ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent>
          <div className="flex flex-col items-center text-center py-6">
            <div className="p-3 rounded-full bg-muted mb-3">
              <Trophy className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">
              No active competitions right now.
            </p>
            {isManager && (
                <Link to="/manager/competitions">
                <ViperButton size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Create Competition
                </ViperButton>
              </Link>
            )}
          </div>
        </ViperCardContent>
      </ViperCard>
    );
  }

  return (
    <ViperCard>
      <ViperCardHeader>
        <div className="flex items-center justify-between">
          <ViperCardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Competitions
          </ViperCardTitle>
          {isManager && (
            <Link to="/manager/competitions">
              <ViperButton variant="ghost" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Manage
              </ViperButton>
            </Link>
          )}
        </div>
      </ViperCardHeader>
      <ViperCardContent className="space-y-4">
        {competitions.map((competition) => {
          const endDate = new Date(competition.end_date);
          const startDate = new Date(competition.start_date);
          const isActive = competition.status === 'active';

          return (
            <div
              key={competition.id}
              className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold">{competition.name}</h4>
                <ViperBadge
                  variant={isActive ? 'success' : 'default'}
                  size="sm"
                >
                  {isActive ? 'Active' : 'Upcoming'}
                </ViperBadge>
              </div>

              <p className="text-sm text-muted-foreground mb-3">
                {competition.description}
              </p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <Trophy className="h-3 w-3" />
                  {metricLabels[competition.metric_type] || competition.metric_type}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {isActive 
                    ? `Ends ${formatDistanceToNow(endDate, { addSuffix: true })}`
                    : `Starts ${format(startDate, 'MMM d')}`
                  }
                </span>
              </div>

              {competition.prize_description && (
                <div className="flex items-center gap-2 p-2 rounded bg-success/10 border border-success/20 text-sm">
                  <Gift className="h-4 w-4 text-success" />
                  <span className="text-success">{competition.prize_description}</span>
                </div>
              )}
            </div>
          );
        })}
      </ViperCardContent>
    </ViperCard>
  );
}