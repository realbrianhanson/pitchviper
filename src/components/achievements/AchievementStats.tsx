import { useGamification, BadgeRarity } from "@/hooks/useGamification";
import { Award, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const rarityColors: Record<BadgeRarity, { bg: string; text: string }> = {
  common: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
  uncommon: { bg: 'bg-green-500/20', text: 'text-green-500' },
  rare: { bg: 'bg-blue-500/20', text: 'text-blue-500' },
  epic: { bg: 'bg-purple-500/20', text: 'text-purple-500' },
  legendary: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
};

export function AchievementStats() {
  const { badges, earnedBadges } = useGamification();

  const totalBadges = badges.filter(b => !b.is_secret || b.earned).length;
  const earnedCount = earnedBadges.length;
  
  const rarityBreakdown = earnedBadges.reduce((acc, badge) => {
    acc[badge.rarity] = (acc[badge.rarity] || 0) + 1;
    return acc;
  }, {} as Record<BadgeRarity, number>);

  const totalXpFromBadges = earnedBadges.reduce((sum, b) => sum + b.xp_reward, 0);

  const rarities: BadgeRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Badges */}
      <div className="bg-card/50 border border-border rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
            <Award className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Badges Earned</p>
            <p className="text-3xl font-display font-bold">
              {earnedCount}
              <span className="text-lg text-muted-foreground font-normal">/{totalBadges}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Rarity Breakdown */}
      <div className="bg-card/50 border border-border rounded-xl p-6">
        <p className="text-sm text-muted-foreground mb-3">By Rarity</p>
        <div className="flex gap-2 flex-wrap">
          {rarities.map(rarity => (
            <div
              key={rarity}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1",
                rarityColors[rarity].bg,
                rarityColors[rarity].text
              )}
            >
              <span className="capitalize">{rarity}</span>
              <span className="font-bold">{rarityBreakdown[rarity] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* XP from Badges */}
      <div className="bg-card/50 border border-border rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-success/20 flex items-center justify-center">
            <Sparkles className="h-7 w-7 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">XP from Badges</p>
            <p className="text-3xl font-display font-bold text-success">
              {totalXpFromBadges.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}