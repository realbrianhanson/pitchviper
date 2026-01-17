import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { ViperBadge } from "@/components/ui/viper-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Phone, 
  Gamepad2, 
  Award, 
  ChevronDown,
  ChevronUp,
  Clock
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface RecentActivityProps {
  calls: any[];
  roleplaySessions: any[];
  badges: any[];
  isLoading: boolean;
}

export function RecentActivity({ 
  calls, 
  roleplaySessions, 
  badges, 
  isLoading 
}: RecentActivityProps) {
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <ViperCard variant="glass">
        <ViperCardHeader>
          <ViperCardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Recent Activity
          </ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </ViperCardContent>
      </ViperCard>
    );
  }

  const outcomeColors: Record<string, string> = {
    connected: 'text-success',
    voicemail: 'text-warning',
    no_answer: 'text-muted-foreground',
    wrong_number: 'text-destructive',
  };

  return (
    <ViperCard variant="glass">
      <ViperCardHeader>
        <ViperCardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Recent Activity
        </ViperCardTitle>
      </ViperCardHeader>
      <ViperCardContent className="p-3 md:p-6">
        <ScrollArea className="h-[350px] md:h-[400px] pr-2 md:pr-3">
          <div className="space-y-6">
            {/* Recent Calls */}
            <div>
              <h4 className="flex items-center gap-2 text-sm font-medium mb-3 text-muted-foreground">
                <Phone className="h-4 w-4" />
                Last 10 Calls
              </h4>
              {calls.length > 0 ? (
                <div className="space-y-2">
                  {calls.map((call) => (
                    <div
                      key={call.id}
                      className="p-3 rounded-lg bg-muted/30 border border-border"
                    >
                      <button
                        className="w-full flex items-center justify-between text-left"
                        onClick={() => setExpandedCallId(
                          expandedCallId === call.id ? null : call.id
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            call.outcome === 'connected' ? "bg-success" :
                            call.outcome === 'voicemail' ? "bg-warning" : "bg-muted"
                          )} />
                          <div>
                            <p className="font-medium text-sm">{call.contact_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {call.company_name || 'No company'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-xs capitalize",
                            outcomeColors[call.outcome]
                          )}>
                            {call.outcome.replace('_', ' ')}
                          </span>
                          {expandedCallId === call.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </button>
                      
                      {expandedCallId === call.id && (
                        <div className="mt-3 pt-3 border-t border-border text-sm space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Duration:</span>
                            <span>{Math.floor(call.duration_seconds / 60)}:{(call.duration_seconds % 60).toString().padStart(2, '0')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Direction:</span>
                            <span className="capitalize">{call.direction}</span>
                          </div>
                          {call.deal_value && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Deal Value:</span>
                              <span className="text-success">${call.deal_value.toLocaleString()}</span>
                            </div>
                          )}
                          {call.notes && (
                            <div className="mt-2">
                              <p className="text-muted-foreground mb-1">Notes:</p>
                              <p className="text-foreground">{call.notes}</p>
                            </div>
                          )}
                          {call.struggled_objections?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-muted-foreground mb-1">Struggled with:</p>
                              <div className="flex flex-wrap gap-1">
                                {call.struggled_objections.map((obj: string, i: number) => (
                                  <ViperBadge key={i} variant="destructive" size="sm">
                                    {obj}
                                  </ViperBadge>
                                ))}
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(call.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No recent calls</p>
              )}
            </div>

            {/* Recent Roleplay Sessions */}
            <div>
              <h4 className="flex items-center gap-2 text-sm font-medium mb-3 text-muted-foreground">
                <Gamepad2 className="h-4 w-4" />
                Last 5 Roleplay Sessions
              </h4>
              {roleplaySessions.length > 0 ? (
                <div className="space-y-2">
                  {roleplaySessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-3 rounded-lg bg-muted/30 border border-border flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {(session.roleplay_scenarios as any)?.name || 'Unknown Scenario'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(session.completed_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "text-lg font-bold",
                          (session.score || 0) >= 80 ? "text-success" :
                          (session.score || 0) >= 60 ? "text-warning" : "text-destructive"
                        )}>
                          {session.score || 'N/A'}
                        </span>
                        <p className="text-xs text-muted-foreground">Score</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No roleplay sessions</p>
              )}
            </div>

            {/* Recent Badges */}
            <div>
              <h4 className="flex items-center gap-2 text-sm font-medium mb-3 text-muted-foreground">
                <Award className="h-4 w-4" />
                Recent Badges
              </h4>
              {badges.length > 0 ? (
                <div className="space-y-2">
                  {badges.map((userBadge) => {
                    const badge = userBadge.badges;
                    return (
                      <div
                        key={userBadge.id}
                        className="p-3 rounded-lg bg-muted/30 border border-border flex items-center gap-3"
                      >
                        <span className="text-2xl">{badge?.icon || '🏆'}</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{badge?.name || 'Unknown Badge'}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(userBadge.earned_at), { addSuffix: true })}
                          </p>
                        </div>
                        <ViperBadge 
                          size="sm" 
                          variant={
                            badge?.rarity === 'legendary' ? 'warning' :
                            badge?.rarity === 'epic' ? 'secondary' :
                            badge?.rarity === 'rare' ? 'outline' : 'default'
                          }
                        >
                          {badge?.rarity || 'common'}
                        </ViperBadge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No recent badges</p>
              )}
            </div>
          </div>
        </ScrollArea>
      </ViperCardContent>
    </ViperCard>
  );
}
