import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Award, PartyPopper } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ViperButton } from "@/components/ui/viper-button";
import { toast } from "@/hooks/use-toast";
import { Badge as BadgeType, BadgeRarity } from "@/hooks/useGamification";

interface RecentAchievement {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  user_name: string;
  user_avatar: string | null;
  badge_name: string;
  badge_rarity: BadgeRarity;
}

const rarityColors: Record<BadgeRarity, string> = {
  common: 'text-slate-400',
  uncommon: 'text-green-500',
  rare: 'text-blue-500',
  epic: 'text-purple-500',
  legendary: 'text-amber-400',
};

export function RecentAchievementsFeed() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<RecentAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecentAchievements();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('recent-badges')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_badges' },
        () => fetchRecentAchievements()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRecentAchievements = async () => {
    try {
      // Get recent user badges with profile and badge info
      const { data: userBadges, error } = await supabase
        .from('user_badges')
        .select(`
          id,
          user_id,
          badge_id,
          earned_at
        `)
        .order('earned_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (!userBadges || userBadges.length === 0) {
        setAchievements([]);
        setIsLoading(false);
        return;
      }

      // Fetch profiles for these users
      const userIds = [...new Set(userBadges.map(ub => ub.user_id))];
      const { data: profiles } = await supabase
        .from('team_profiles_safe')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      // Fetch badges
      const badgeIds = [...new Set(userBadges.map(ub => ub.badge_id))];
      const { data: badges } = await (supabase
        .from('badges' as any)
        .select('id, name, rarity')
        .in('id', badgeIds)) as any;

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const badgeMap = new Map((badges || []).map((b: { id: string; name: string; rarity: string }) => [b.id, b]));

      const enrichedAchievements: RecentAchievement[] = userBadges
        .map(ub => {
          const profile = profileMap.get(ub.user_id);
          const badge = badgeMap.get(ub.badge_id) as { id: string; name: string; rarity: string } | undefined;
          if (!profile || !badge) return null;
          
          return {
            id: ub.id,
            user_id: ub.user_id,
            badge_id: ub.badge_id,
            earned_at: ub.earned_at,
            user_name: profile.full_name,
            user_avatar: profile.avatar_url,
            badge_name: badge.name,
            badge_rarity: badge.rarity as BadgeRarity,
          };
        })
        .filter(Boolean) as RecentAchievement[];

      setAchievements(enrichedAchievements);
    } catch (error) {
      console.error('Error fetching recent achievements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendCelebration = (achievement: RecentAchievement) => {
    // In a real app, this would send a notification to the user
    toast({
      title: '🎉 Kudos sent!',
      description: `You celebrated ${achievement.user_name}'s achievement!`,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="h-3 w-1/2 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No recent achievements yet.</p>
        <p className="text-sm">Be the first to earn a badge!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto">
      {achievements.map((achievement) => (
        <div
          key={achievement.id}
          className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border hover:bg-card/80 transition-colors"
        >
          <Avatar className="h-10 w-10 border border-border">
            <AvatarImage src={achievement.user_avatar || undefined} />
            <AvatarFallback className="text-sm">
              {achievement.user_name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-semibold">{achievement.user_name}</span>
              {' earned '}
              <span className={`font-semibold ${rarityColors[achievement.badge_rarity]}`}>
                {achievement.badge_name}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(achievement.earned_at), { addSuffix: true })}
            </p>
          </div>

          {achievement.user_id !== user?.id && (
            <ViperButton
              size="sm"
              variant="ghost"
              onClick={() => sendCelebration(achievement)}
              className="flex-shrink-0"
            >
              <PartyPopper className="h-4 w-4" />
            </ViperButton>
          )}
        </div>
      ))}
    </div>
  );
}