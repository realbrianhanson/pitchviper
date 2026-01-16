import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { Trophy, Phone, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface Performer {
  user_id: string;
  profile: { full_name: string; avatar_url: string | null } | null;
  total?: number;
  connected?: number;
  connectRate?: number;
  appointments?: number;
}

interface TopPerformersCardProps {
  byConnectRate: Performer[];
  byAppointments: Performer[];
}

function PerformerRow({ 
  performer, 
  rank, 
  metric, 
  metricLabel 
}: { 
  performer: Performer; 
  rank: number; 
  metric: string | number;
  metricLabel: string;
}) {
  const initials = performer.profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  return (
    <div className={cn(
      "flex items-center gap-3 p-2 rounded-lg",
      rank === 1 && "bg-warning/10"
    )}>
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
        rank === 1 ? "bg-warning text-warning-foreground" :
        rank === 2 ? "bg-muted text-foreground" :
        "bg-muted/50 text-muted-foreground"
      )}>
        {rank}
      </div>
      
      {performer.profile?.avatar_url ? (
        <img
          src={performer.profile.avatar_url}
          alt={performer.profile.full_name}
          className="w-8 h-8 rounded-full object-cover"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-xs font-medium text-primary">{initials}</span>
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {performer.profile?.full_name || 'Unknown'}
        </p>
        <p className="text-xs text-muted-foreground">{metricLabel}</p>
      </div>
      
      <div className="text-right">
        <p className="text-sm font-bold text-primary">{metric}</p>
      </div>
    </div>
  );
}

export function TopPerformersCard({ byConnectRate, byAppointments }: TopPerformersCardProps) {
  const hasData = byConnectRate.length > 0 || byAppointments.length > 0;

  if (!hasData) {
    return (
      <ViperCard variant="glass">
        <ViperCardHeader>
          <ViperCardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" />
            Top Performers
          </ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <p>No team data available</p>
          </div>
        </ViperCardContent>
      </ViperCard>
    );
  }

  return (
    <ViperCard variant="glass">
      <ViperCardHeader>
        <ViperCardTitle className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-warning" />
          Top Performers This Period
        </ViperCardTitle>
      </ViperCardHeader>
      <ViperCardContent className="space-y-6">
        {/* By Connect Rate */}
        {byConnectRate.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                By Connect Rate
              </span>
            </div>
            <div className="space-y-1">
              {byConnectRate.slice(0, 3).map((performer, index) => (
                <PerformerRow
                  key={performer.user_id}
                  performer={performer}
                  rank={index + 1}
                  metric={`${performer.connectRate?.toFixed(1)}%`}
                  metricLabel={`${performer.connected}/${performer.total} calls`}
                />
              ))}
            </div>
          </div>
        )}

        {/* By Appointments */}
        {byAppointments.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                By Appointments Set
              </span>
            </div>
            <div className="space-y-1">
              {byAppointments.slice(0, 3).map((performer, index) => (
                <PerformerRow
                  key={performer.user_id}
                  performer={performer}
                  rank={index + 1}
                  metric={performer.appointments || 0}
                  metricLabel="appointments"
                />
              ))}
            </div>
          </div>
        )}
      </ViperCardContent>
    </ViperCard>
  );
}
