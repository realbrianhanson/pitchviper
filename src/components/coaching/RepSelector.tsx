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
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Quick Filters - Stack on narrow screens */}
      <div className="flex flex-wrap gap-2">
        <ViperButton
          size="sm"
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          className="text-xs h-8 px-3"
        >
          All ({members.length})
        </ViperButton>
        <ViperButton
          size="sm"
          variant={filter === 'needs-coaching' ? 'default' : 'outline'}
          onClick={() => setFilter('needs-coaching')}
          className="text-xs h-8 px-3"
        >
          <AlertCircle className="h-3 w-3 mr-1 shrink-0" />
          <span className="truncate">Needs Coaching</span>
        </ViperButton>
      </div>

      {/* Rep List */}
      <ScrollArea className="h-[50vh] lg:h-[calc(100vh-320px)] pr-2">
        <div className="space-y-2 pb-4">
          {filteredMembers.map((member) => {
            const daysSinceCoaching = getDaysSinceCoaching(member.last_coached_at);
            const needsCoaching = daysSinceCoaching === null || daysSinceCoaching >= 7;
            const isSelected = selectedRepId === member.user_id;

            return (
              <button
                key={member.user_id}
                onClick={() => onSelectRep(member.user_id)}
                className={cn(
                  "w-full p-2.5 rounded-lg border transition-all text-left",
                  "hover:border-primary/50 hover:bg-muted/30",
                  isSelected 
                    ? "border-primary bg-primary/10" 
                    : "border-border bg-background/50"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Avatar className={cn(
                    "h-9 w-9 shrink-0 border",
                    isSelected ? "border-primary" : "border-border"
                  )}>
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {member.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{member.full_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <ViperBadge size="sm" variant="default" className="text-[10px] px-1.5 py-0">
                        Lvl {member.current_level}
                      </ViperBadge>
                      {needsCoaching ? (
                        <span className="text-[10px] text-warning flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {daysSinceCoaching === null ? 'Never' : `${daysSinceCoaching}d`}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {daysSinceCoaching}d
                        </span>
                      )}
                    </div>
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
