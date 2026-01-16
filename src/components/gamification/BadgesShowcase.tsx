import { useGamification, BadgeCategory, BadgeRarity, Badge } from "@/hooks/useGamification";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { Badge as BadgeUI } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Award, 
  Lock, 
  Phone, 
  Target, 
  Flame, 
  Users, 
  GraduationCap, 
  Sparkles,
  Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BadgeDisplayProps {
  badge: Badge & { earned?: boolean };
  size?: 'sm' | 'md' | 'lg';
}

const categoryIcons: Record<BadgeCategory, React.ReactNode> = {
  calls: <Phone className="h-4 w-4" />,
  closes: <Target className="h-4 w-4" />,
  streaks: <Flame className="h-4 w-4" />,
  roleplay: <Users className="h-4 w-4" />,
  training: <GraduationCap className="h-4 w-4" />,
  team: <Users className="h-4 w-4" />,
  special: <Sparkles className="h-4 w-4" />
};

const rarityGradients: Record<BadgeRarity, string> = {
  common: 'from-slate-500/20 to-slate-600/20 border-slate-500/30',
  uncommon: 'from-green-500/20 to-green-600/20 border-green-500/30',
  rare: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
  epic: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
  legendary: 'from-amber-500/20 to-amber-600/20 border-amber-500/30 animate-pulse'
};

export function BadgeDisplay({ badge, size = 'md' }: BadgeDisplayProps) {
  const { getRarityColor } = useGamification();
  
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  };

  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-7 w-7',
    lg: 'h-9 w-9'
  };

  return (
    <Tooltip>
      <TooltipTrigger>
        <div 
          className={cn(
            "relative rounded-full flex items-center justify-center border-2 transition-all",
            sizeClasses[size],
            badge.earned 
              ? `bg-gradient-to-br ${rarityGradients[badge.rarity]}`
              : 'bg-muted/30 border-muted grayscale opacity-50'
          )}
        >
          {badge.earned ? (
            <Award className={cn(iconSizes[size], getRarityColor(badge.rarity).split(' ')[0])} />
          ) : (
            <Lock className={cn(iconSizes[size], 'text-muted-foreground')} />
          )}
          
          {badge.earned && badge.rarity === 'legendary' && (
            <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{badge.name}</span>
            <BadgeUI variant="outline" className={cn("text-xs capitalize", getRarityColor(badge.rarity))}>
              {badge.rarity}
            </BadgeUI>
          </div>
          <p className="text-xs text-muted-foreground">{badge.description}</p>
          <p className="text-xs text-primary">+{badge.xp_reward} XP</p>
          {!badge.earned && (
            <p className="text-xs text-warning mt-1">{badge.requirement_description}</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface BadgesShowcaseProps {
  limit?: number;
  showCategories?: boolean;
}

export function BadgesShowcase({ limit, showCategories = true }: BadgesShowcaseProps) {
  const { badges, earnedBadges, getBadgesByCategory, isLoading } = useGamification();

  const categories: { key: BadgeCategory; label: string }[] = [
    { key: 'calls', label: 'Calls' },
    { key: 'closes', label: 'Closes' },
    { key: 'streaks', label: 'Streaks' },
    { key: 'roleplay', label: 'Roleplay' },
    { key: 'training', label: 'Training' },
    { key: 'team', label: 'Team' },
    { key: 'special', label: 'Special' }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="w-16 h-16 rounded-full bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!showCategories) {
    const displayBadges = limit ? earnedBadges.slice(0, limit) : earnedBadges;
    return (
      <div className="flex flex-wrap gap-3">
        {displayBadges.map(badge => (
          <BadgeDisplay key={badge.id} badge={badge} size="md" />
        ))}
        {earnedBadges.length === 0 && (
          <p className="text-sm text-muted-foreground">No badges earned yet. Start completing challenges!</p>
        )}
      </div>
    );
  }

  return (
    <Tabs defaultValue="calls" className="w-full">
      <TabsList className="grid grid-cols-7 bg-muted/50 mb-4">
        {categories.map(cat => (
          <TabsTrigger 
            key={cat.key} 
            value={cat.key}
            className="text-xs px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            {categoryIcons[cat.key]}
          </TabsTrigger>
        ))}
      </TabsList>

      {categories.map(cat => {
        const categoryBadges = getBadgesByCategory(cat.key);
        return (
          <TabsContent key={cat.key} value={cat.key} className="mt-0">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
              {categoryBadges.map(badge => (
                <BadgeDisplay key={badge.id} badge={badge} />
              ))}
            </div>
            {categoryBadges.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No badges in this category yet.
              </p>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
