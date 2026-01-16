import { useState, useMemo } from "react";
import { Badge as BadgeType, BadgeRarity, BadgeCategory, useGamification } from "@/hooks/useGamification";
import { Award, Lock, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { BadgeDetailModal } from "./BadgeDetailModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FilterOption = 'all' | 'earned' | 'locked' | BadgeCategory | BadgeRarity;

const rarityColors: Record<BadgeRarity, string> = {
  common: 'border-slate-400/50 hover:border-slate-400',
  uncommon: 'border-green-500/50 hover:border-green-500',
  rare: 'border-blue-500/50 hover:border-blue-500',
  epic: 'border-purple-500/50 hover:border-purple-500',
  legendary: 'border-amber-400/50 hover:border-amber-400',
};

const rarityGlows: Record<BadgeRarity, string> = {
  common: '',
  uncommon: 'hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]',
  rare: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]',
  epic: 'shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)]',
  legendary: 'shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_35px_rgba(245,158,11,0.6)] animate-pulse',
};

const rarityIconColors: Record<BadgeRarity, string> = {
  common: 'text-slate-400',
  uncommon: 'text-green-500',
  rare: 'text-blue-500',
  epic: 'text-purple-500',
  legendary: 'text-amber-400',
};

const categoryLabels: Record<BadgeCategory, string> = {
  calls: 'Calls',
  closes: 'Closes',
  streaks: 'Streaks',
  roleplay: 'Roleplay',
  training: 'Training',
  team: 'Team',
  special: 'Special',
};

const rarityLabels: Record<BadgeRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export function BadgeGallery() {
  const { badges, isLoading } = useGamification();
  const [selectedBadge, setSelectedBadge] = useState<(BadgeType & { earned?: boolean }) | null>(null);
  const [filterType, setFilterType] = useState<'status' | 'category' | 'rarity'>('status');
  const [filterValue, setFilterValue] = useState<string>('all');

  const filteredBadges = useMemo(() => {
    let filtered = [...badges];

    if (filterType === 'status') {
      if (filterValue === 'earned') {
        filtered = filtered.filter(b => b.earned);
      } else if (filterValue === 'locked') {
        filtered = filtered.filter(b => !b.earned && !b.is_secret);
      }
    } else if (filterType === 'category') {
      filtered = filtered.filter(b => b.category === filterValue);
    } else if (filterType === 'rarity') {
      filtered = filtered.filter(b => b.rarity === filterValue);
    }

    // Sort by rarity (legendary first), then by earned status
    const rarityOrder: Record<BadgeRarity, number> = {
      legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4
    };
    
    return filtered.sort((a, b) => {
      if (a.earned !== b.earned) return a.earned ? -1 : 1;
      return rarityOrder[a.rarity] - rarityOrder[b.rarity];
    });
  }, [badges, filterType, filterValue]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
        {[...Array(16)].map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        
        <Select value={filterType} onValueChange={(v) => {
          setFilterType(v as any);
          setFilterValue(v === 'status' ? 'all' : v === 'category' ? 'calls' : 'common');
        }}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="category">Category</SelectItem>
            <SelectItem value="rarity">Rarity</SelectItem>
          </SelectContent>
        </Select>

        {filterType === 'status' && (
          <Select value={filterValue} onValueChange={setFilterValue}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="earned">Earned</SelectItem>
              <SelectItem value="locked">Locked</SelectItem>
            </SelectContent>
          </Select>
        )}

        {filterType === 'category' && (
          <Select value={filterValue} onValueChange={setFilterValue}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {filterType === 'rarity' && (
          <Select value={filterValue} onValueChange={setFilterValue}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(rarityLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <span className="text-sm text-muted-foreground ml-auto">
          {filteredBadges.length} badges
        </span>
      </div>

      {/* Badge Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {filteredBadges.map((badge) => {
          const isSecret = badge.is_secret && !badge.earned;
          
          return (
            <button
              key={badge.id}
              onClick={() => !isSecret && setSelectedBadge(badge)}
              className={cn(
                "group aspect-square rounded-xl flex flex-col items-center justify-center p-2 border-2 transition-all duration-300",
                badge.earned
                  ? `bg-gradient-to-br from-card to-muted/50 ${rarityColors[badge.rarity]} ${rarityGlows[badge.rarity]}`
                  : 'bg-muted/20 border-muted/50 opacity-50 grayscale hover:opacity-70',
                !isSecret && 'cursor-pointer'
              )}
              disabled={isSecret}
            >
              {isSecret ? (
                <>
                  <Lock className="h-8 w-8 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">???</span>
                </>
              ) : (
                <>
                  {badge.earned ? (
                    <Award className={cn("h-8 w-8 mb-1", rarityIconColors[badge.rarity])} />
                  ) : (
                    <div className="relative">
                      <Award className="h-8 w-8 mb-1 text-muted-foreground" />
                      <Lock className="absolute -bottom-1 -right-1 h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <span className="text-[10px] text-center line-clamp-2 text-foreground/80 group-hover:text-foreground">
                    {badge.name}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {filteredBadges.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No badges match your filter criteria.
        </div>
      )}

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <BadgeDetailModal
          badge={selectedBadge}
          isOpen={!!selectedBadge}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </div>
  );
}