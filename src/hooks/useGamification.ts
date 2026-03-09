import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type BadgeCategory = 'calls' | 'closes' | 'streaks' | 'roleplay' | 'training' | 'team' | 'special';
export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Level {
  id: string;
  level_number: number;
  title: string;
  xp_required: number;
  badge_icon: string;
  perks: string[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  requirement_type: string;
  requirement_value: number;
  requirement_description: string;
  xp_reward: number;
  rarity: BadgeRarity;
  is_secret: boolean;
  earned?: boolean;
  earned_at?: string;
}

export interface UserProgress {
  currentLevel: Level | null;
  nextLevel: Level | null;
  xpToNextLevel: number;
  progressPercent: number;
  totalXp: number;
}

export interface NewBadgeResult {
  badgeId: string;
  badgeName: string;
  earned: boolean;
  xpReward: number;
}

export interface BadgeCheckResult {
  success: boolean;
  newBadges: NewBadgeResult[];
  leveledUp: boolean;
  newLevel: Level | null;
  totalNewXp: number;
}

export function useGamification() {
  const { user } = useAuth();
  const [levels, setLevels] = useState<Level[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<Set<string>>(new Set());
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLevels = async () => {
    const { data, error } = await (supabase
      .from('levels' as any)
      .select('*')
      .order('level_number')) as any;

    if (!error && data) {
      setLevels(data);
    }
  };

  const fetchBadges = async () => {
    const { data, error } = await (supabase
      .from('badges' as any)
      .select('*')
      .order('rarity')) as any;

    if (!error && data) {
      setBadges(data.map((b: any) => ({
        ...b,
        category: b.category as BadgeCategory,
        rarity: b.rarity as BadgeRarity
      })));
    }
  };

  const fetchUserBadges = async () => {
    if (!user) return;

    const { data, error } = await (supabase
      .from('user_badges' as any)
      .select('badge_id, earned_at')
      .eq('user_id', user.id)) as any;

    if (!error && data) {
      setEarnedBadgeIds(new Set(data.map((ub: any) => ub.badge_id)));
    }
  };

  const fetchUserProgress = async () => {
    if (!user || levels.length === 0) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('xp_points, current_level')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile) {
      const currentLevel = levels.find(l => l.level_number === profile.current_level) || levels[0];
      const nextLevel = levels.find(l => l.level_number === (currentLevel?.level_number || 0) + 1);
      
      const currentLevelXp = currentLevel?.xp_required || 0;
      const nextLevelXp = nextLevel?.xp_required || currentLevelXp;
      const xpInCurrentLevel = profile.xp_points - currentLevelXp;
      const xpNeededForNext = nextLevelXp - currentLevelXp;
      
      setUserProgress({
        currentLevel,
        nextLevel: nextLevel || null,
        xpToNextLevel: nextLevel ? nextLevelXp - profile.xp_points : 0,
        progressPercent: nextLevel ? Math.min((xpInCurrentLevel / xpNeededForNext) * 100, 100) : 100,
        totalXp: profile.xp_points
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchLevels(), fetchBadges()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserBadges();
    }
  }, [user]);

  useEffect(() => {
    if (user && levels.length > 0) {
      fetchUserProgress();
    }
  }, [user, levels]);

  const checkBadgeEligibility = useCallback(async (triggerType?: string): Promise<BadgeCheckResult | null> => {
    if (!user) return null;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-badge-eligibility`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
          },
          body: JSON.stringify({ user_id: user.id, trigger_type: triggerType })
        }
      );

      const result = await response.json();

      if (result.success && result.newBadges?.length > 0) {
        // Refresh user data
        await Promise.all([fetchUserBadges(), fetchUserProgress()]);
      }

      return result;
    } catch (error) {
      console.error('Error checking badge eligibility:', error);
      return null;
    }
  }, [user]);

  // Combine badges with earned status
  const badgesWithStatus = badges.map(badge => ({
    ...badge,
    earned: earnedBadgeIds.has(badge.id)
  }));

  const earnedBadges = badgesWithStatus.filter(b => b.earned);
  const unearnedBadges = badgesWithStatus.filter(b => !b.earned && !b.is_secret);

  const getBadgesByCategory = (category: BadgeCategory) => 
    badgesWithStatus.filter(b => b.category === category);

  const getRarityColor = (rarity: BadgeRarity): string => {
    switch (rarity) {
      case 'common': return 'text-slate-400 border-slate-400/30 bg-slate-400/10';
      case 'uncommon': return 'text-green-400 border-green-400/30 bg-green-400/10';
      case 'rare': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
      case 'epic': return 'text-purple-400 border-purple-400/30 bg-purple-400/10';
      case 'legendary': return 'text-amber-400 border-amber-400/30 bg-amber-400/10';
      default: return 'text-muted-foreground';
    }
  };

  return {
    levels,
    badges: badgesWithStatus,
    earnedBadges,
    unearnedBadges,
    userProgress,
    isLoading,
    checkBadgeEligibility,
    getBadgesByCategory,
    getRarityColor,
    refetch: async () => {
      await Promise.all([fetchLevels(), fetchBadges(), fetchUserBadges(), fetchUserProgress()]);
    }
  };
}
