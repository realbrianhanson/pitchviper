import { Trophy, Calendar, Users, ChevronRight, Medal } from "lucide-react";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { ViperBadge } from "@/components/ui/viper-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Competition } from "@/hooks/useCompetitions";
import { format } from "date-fns";

interface PastCompetitionsProps {
  competitions: Competition[];
  onViewDetails: (competition: Competition) => void;
}

const metricLabels: Record<string, string> = {
  calls: 'Most Calls',
  appointments: 'Most Appointments',
  revenue: 'Highest Revenue',
  deals: 'Most Deals',
  roleplay: 'Best Roleplay',
  custom: 'Custom',
};

export function PastCompetitions({ competitions, onViewDetails }: PastCompetitionsProps) {
  if (competitions.length === 0) {
    return (
      <ViperCard>
        <ViperCardHeader>
          <ViperCardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-muted-foreground" />
            Past Competitions
          </ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Trophy className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No Past Competitions</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Completed competitions will appear here with their final standings.
            </p>
          </div>
        </ViperCardContent>
      </ViperCard>
    );
  }

  return (
    <ViperCard>
      <ViperCardHeader>
        <ViperCardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-muted-foreground" />
          Past Competitions
        </ViperCardTitle>
      </ViperCardHeader>
      <ViperCardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competition</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Metric</TableHead>
                <TableHead>Winners</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {competitions.map((competition) => (
                <TableRow key={competition.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{competition.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {competition.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {format(new Date(competition.end_date), 'MMM d, yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ViperBadge variant="secondary" size="sm">
                      {metricLabels[competition.metric_type]}
                    </ViperBadge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Medal className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Top {competition.number_of_winners}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ViperBadge 
                      variant={competition.status === 'completed' ? 'success' : 'destructive'} 
                      size="sm"
                    >
                      {competition.status}
                    </ViperBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <ViperButton 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onViewDetails(competition)}
                    >
                      View
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </ViperButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ViperCardContent>
    </ViperCard>
  );
}
