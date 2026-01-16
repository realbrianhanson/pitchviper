import { useState } from "react";
import { RepCoachingProfile } from "@/hooks/useCoaching";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ViperButton } from "@/components/ui/viper-button";
import { ViperBadge } from "@/components/ui/viper-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Clock, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface RepSelectorProps {
  members: RepCoachingProfile[];
  selectedRepId: string | null;
  onSelectRep: (repId: string) => void;
  isLoading: boolean;
}

export function RepSelector({ members, selectedRepId, onSelectRep, isLoading }: RepSelectorProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'needs-coaching'>('all');

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const getDaysSinceCoaching = (lastCoachedAt: string | null) => {
    if (!lastCoachedAt) return null;
    const last = new Date(lastCoachedAt);
    const now = new Date();
    return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  };

  const filteredMembers = members
    .filter(m => {
      if (search && !m.full_name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (filter === 'needs-coaching') {
        const days = getDaysSinceCoaching(m.last_coached_at);
        return days === null || days >= 7;
      }
      return true;
    })
    .sort((a, b) => {
      // Sort by needs coaching first
      const aDays = getDaysSinceCoaching(a.last_coached_at) ?? Infinity;
      const bDays = getDaysSinceCoaching(b.last_coached_at) ?? Infinity;
      return bDays - aDays;
    });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search team members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Quick Filters */}
      <div className="flex gap-2">
        <ViperButton
          size="sm"
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All ({members.length})
        </ViperButton>
        <ViperButton
          size="sm"
          variant={filter === 'needs-coaching' ? 'default' : 'outline'}
          onClick={() => setFilter('needs-coaching')}
        >
          <AlertCircle className="h-3 w-3 mr-1" />
          Needs Coaching
        </ViperButton>
      </div>

      {/* Rep List */}
      <ScrollArea className="h-[calc(100vh-350px)] pr-3">
        <div className="space-y-2">
          {filteredMembers.map((member) => {
            const daysSinceCoaching = getDaysSinceCoaching(member.last_coached_at);
            const needsCoaching = daysSinceCoaching === null || daysSinceCoaching >= 7;
            const isSelected = selectedRepId === member.user_id;

            return (
              <button
                key={member.user_id}
                onClick={() => onSelectRep(member.user_id)}
                className={cn(
                  "w-full p-3 rounded-lg border transition-all text-left",
                  "hover:border-primary/50 hover:bg-muted/30",
                  isSelected 
                    ? "border-primary bg-primary/10 shadow-glow-sm" 
                    : "border-border bg-background/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar className={cn(
                    "h-10 w-10 border",
                    isSelected ? "border-primary" : "border-border"
                  )}>
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-sm">
                      {member.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{member.full_name}</p>
                      <ViperBadge size="sm" variant="default">
                        Lvl {member.current_level}
                      </ViperBadge>
                    </div>
                    {member.title && (
                      <p className="text-xs text-muted-foreground truncate">
                        {member.title}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    {needsCoaching ? (
                      <div className="flex items-center gap-1 text-warning text-xs">
                        <Clock className="h-3 w-3" />
                        <span>
                          {daysSinceCoaching === null 
                            ? 'Never' 
                            : `${daysSinceCoaching}d ago`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Clock className="h-3 w-3" />
                        <span>{daysSinceCoaching}d ago</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {filteredMembers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No team members match your search.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
