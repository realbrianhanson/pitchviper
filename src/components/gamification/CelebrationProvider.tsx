import { useState, createContext, useContext, ReactNode, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ViperButton } from '@/components/ui/viper-button';
import confetti from 'canvas-confetti';
import { BRAND_CONFETTI_COLORS, BRAND_CONFETTI_VICTORY, prefersReducedMotion } from '@/lib/confetti';
import { Trophy, Sparkles, ArrowUp, Award, Share2, Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge as BadgeType, BadgeRarity, Level } from '@/hooks/useGamification';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BadgeCelebrationData {
  badge: BadgeType;
  xpReward: number;
}

interface LevelCelebrationData {
  level: Level;
}

type CelebrationData = 
  | { type: 'badge'; data: BadgeCelebrationData }
  | { type: 'level'; data: LevelCelebrationData };

interface CelebrationContextType {
  celebrateBadge: (badge: BadgeType, xpReward: number) => void;
  celebrateLevelUp: (level: Level) => void;
  celebrateMultipleBadges: (badges: Array<{ badge: BadgeType; xpReward: number }>) => void;
}

const CelebrationContext = createContext<CelebrationContextType | null>(null);

export function useCelebration() {
  const context = useContext(CelebrationContext);
  if (!context) {
    throw new Error('useCelebration must be used within CelebrationProvider');
  }
  return context;
}

// Rarity-tiered palettes stay strictly on-brand: brushed gold + acid green.
// Distinction between tiers is by particle count/velocity, never by hue.
const rarityConfettiConfig: Record<BadgeRarity, { particleCount: number; colors: string[] }> = {
  common:    { particleCount: 30,  colors: ["#E8C76F", "#D4A84A", "#F5D982"] },
  uncommon:  { particleCount: 50,  colors: BRAND_CONFETTI_COLORS },
  rare:      { particleCount: 80,  colors: BRAND_CONFETTI_COLORS },
  epic:      { particleCount: 120, colors: BRAND_CONFETTI_VICTORY },
  legendary: { particleCount: 200, colors: BRAND_CONFETTI_VICTORY },
};

const rarityGlowStyles: Record<BadgeRarity, string> = {
  common: 'shadow-[0_0_20px_rgba(148,163,184,0.3)]',
  uncommon: 'shadow-[0_0_30px_rgba(34,197,94,0.4)]',
  rare: 'shadow-[0_0_40px_rgba(59,130,246,0.5)]',
  epic: 'shadow-[0_0_50px_rgba(168,85,247,0.6)] animate-pulse',
  legendary: 'shadow-[0_0_60px_rgba(245,158,11,0.7)] animate-[pulse_1s_ease-in-out_infinite]',
};

const rarityBorderStyles: Record<BadgeRarity, string> = {
  common: 'border-slate-400',
  uncommon: 'border-green-500',
  rare: 'border-blue-500',
  epic: 'border-purple-500',
  legendary: 'border-amber-400 border-2',
};

interface CelebrationProviderProps {
  children: ReactNode;
}

export function CelebrationProvider({ children }: CelebrationProviderProps) {
  const [queue, setQueue] = useState<CelebrationData[]>([]);
  const [current, setCurrent] = useState<CelebrationData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);

  const processQueue = useCallback(() => {
    if (!isOpen && queue.length > 0) {
      const [next, ...rest] = queue;
      setCurrent(next);
      setQueue(rest);
      setIsOpen(true);
      setShareImageUrl(null);
      triggerConfetti(next);
      playSound(next);
    }
  }, [isOpen, queue]);

  // Process queue when it changes
  useState(() => {
    processQueue();
  });

  const triggerConfetti = (celebration: CelebrationData) => {
    if (celebration.type === 'badge') {
      const config = rarityConfettiConfig[celebration.data.badge.rarity];
      
      // Main burst
      confetti({
        particleCount: config.particleCount,
        spread: 70,
        origin: { y: 0.6 },
        colors: config.colors
      });

      // Side bursts for epic and legendary
      if (['epic', 'legendary'].includes(celebration.data.badge.rarity)) {
        setTimeout(() => {
          confetti({
            particleCount: config.particleCount / 2,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: config.colors
          });
          confetti({
            particleCount: config.particleCount / 2,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: config.colors
          });
        }, 200);
      }

      // Continuous particles for legendary
      if (celebration.data.badge.rarity === 'legendary') {
        const interval = setInterval(() => {
          confetti({
            particleCount: 10,
            spread: 360,
            startVelocity: 15,
            decay: 0.95,
            origin: { x: Math.random(), y: Math.random() * 0.5 },
            colors: config.colors
          });
        }, 100);
        setTimeout(() => clearInterval(interval), 2000);
      }
    } else {
      // Level up celebration
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#00f0ff', '#00ff88', '#ffaa00', '#ff00aa']
      });
    }
  };

  const playSound = (celebration: CelebrationData) => {
    // Sound would be implemented here - using Web Audio API
    // For now we'll skip actual sound implementation
  };

  const celebrateBadge = useCallback((badge: BadgeType, xpReward: number) => {
    setQueue(prev => [...prev, { type: 'badge', data: { badge, xpReward } }]);
    setTimeout(processQueue, 100);
  }, [processQueue]);

  const celebrateLevelUp = useCallback((level: Level) => {
    setQueue(prev => [...prev, { type: 'level', data: { level } }]);
    setTimeout(processQueue, 100);
  }, [processQueue]);

  const celebrateMultipleBadges = useCallback((badges: Array<{ badge: BadgeType; xpReward: number }>) => {
    const celebrations: CelebrationData[] = badges.map(b => ({
      type: 'badge' as const,
      data: b
    }));
    setQueue(prev => [...prev, ...celebrations]);
    setTimeout(processQueue, 100);
  }, [processQueue]);

  const handleClose = () => {
    setIsOpen(false);
    setCurrent(null);
    setShareImageUrl(null);
    // Process next in queue after a short delay
    setTimeout(processQueue, 300);
  };

  const generateShareImage = async () => {
    if (!current || current.type !== 'badge') return;
    
    setIsGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-achievement-image', {
        body: {
          badge_name: current.data.badge.name,
          badge_icon: current.data.badge.icon,
          badge_rarity: current.data.badge.rarity,
          user_name: 'You', // Would get from auth context
          achievement_date: new Date().toLocaleDateString()
        }
      });

      if (error) throw error;
      
      if (data.success && data.image_url) {
        setShareImageUrl(data.image_url);
      } else {
        throw new Error(data.error || 'Failed to generate image');
      }
    } catch (error) {
      console.error('Error generating share image:', error);
      toast({
        title: 'Could not generate image',
        description: 'Try again later',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const downloadImage = () => {
    if (!shareImageUrl) return;
    
    const link = document.createElement('a');
    link.href = shareImageUrl;
    link.download = `pitchviper-achievement-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <CelebrationContext.Provider value={{ celebrateBadge, celebrateLevelUp, celebrateMultipleBadges }}>
      {children}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg bg-card/95 backdrop-blur-xl border-border text-center overflow-hidden p-0">
          {current?.type === 'badge' && (
            <div className="relative">
              {/* Background effects */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80 pointer-events-none" />
              {current.data.badge.rarity === 'legendary' && (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.1)_0%,transparent_70%)] animate-pulse" />
              )}
              {current.data.badge.rarity === 'epic' && (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.1)_0%,transparent_70%)] animate-pulse" />
              )}

              <div className="py-8 px-6 space-y-6 relative">
                {/* Achievement unlocked banner */}
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  <span className="text-sm font-bold uppercase tracking-widest text-primary">
                    Achievement Unlocked!
                  </span>
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                </div>

                {/* Badge icon */}
                <div className="relative mx-auto w-28 h-28">
                  <div className={cn(
                    "absolute inset-0 rounded-full",
                    rarityGlowStyles[current.data.badge.rarity]
                  )} />
                  <div className={cn(
                    "relative flex items-center justify-center w-full h-full rounded-full border-2 bg-gradient-to-br from-card to-background",
                    rarityBorderStyles[current.data.badge.rarity]
                  )}>
                    <Award className={cn(
                      "h-14 w-14",
                      current.data.badge.rarity === 'legendary' ? 'text-amber-400' :
                      current.data.badge.rarity === 'epic' ? 'text-purple-400' :
                      current.data.badge.rarity === 'rare' ? 'text-blue-400' :
                      current.data.badge.rarity === 'uncommon' ? 'text-green-400' :
                      'text-slate-400'
                    )} />
                  </div>
                  {current.data.badge.rarity === 'legendary' && (
                    <div className="absolute -inset-2 rounded-full border border-amber-400/30 animate-ping" />
                  )}
                </div>

                {/* Badge info */}
                <div className="space-y-2">
                  <h2 className="text-3xl font-display font-bold text-foreground">
                    {current.data.badge.name}
                  </h2>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    {current.data.badge.description}
                  </p>
                  <div className={cn(
                    "inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide",
                    current.data.badge.rarity === 'legendary' ? 'bg-amber-500/20 text-amber-400' :
                    current.data.badge.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
                    current.data.badge.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' :
                    current.data.badge.rarity === 'uncommon' ? 'bg-green-500/20 text-green-400' :
                    'bg-slate-500/20 text-slate-400'
                  )}>
                    {current.data.badge.rarity}
                  </div>
                </div>

                {/* XP reward */}
                <div className="flex items-center justify-center gap-2 py-3 px-6 bg-success/10 rounded-lg border border-success/20">
                  <Sparkles className="h-5 w-5 text-success" />
                  <span className="text-xl font-display font-bold text-success">
                    +{current.data.xpReward} XP
                  </span>
                </div>

                {/* Share image preview */}
                {shareImageUrl && (
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img src={shareImageUrl} alt="Achievement" className="w-full" />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 justify-center pt-2">
                  {!shareImageUrl ? (
                    <>
                      <ViperButton
                        variant="outline"
                        onClick={generateShareImage}
                        disabled={isGeneratingImage}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        {isGeneratingImage ? 'Generating...' : 'Share'}
                      </ViperButton>
                      <ViperButton onClick={handleClose}>
                        Continue
                      </ViperButton>
                    </>
                  ) : (
                    <>
                      <ViperButton variant="outline" onClick={downloadImage}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </ViperButton>
                      <ViperButton onClick={handleClose}>
                        Done
                      </ViperButton>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {current?.type === 'level' && (
            <div className="py-8 px-6 space-y-6">
              {/* Level up banner */}
              <div className="flex items-center justify-center gap-2">
                <ArrowUp className="h-5 w-5 text-warning animate-bounce" />
                <span className="text-sm font-bold uppercase tracking-widest text-warning">
                  Level Up!
                </span>
                <ArrowUp className="h-5 w-5 text-warning animate-bounce" />
              </div>

              {/* Level display */}
              <div className="relative mx-auto w-32 h-32">
                <div className="absolute inset-0 rounded-full bg-warning/20 animate-pulse" />
                <div className="relative flex items-center justify-center w-full h-full rounded-full border-2 border-warning bg-gradient-to-br from-warning/20 to-primary/20">
                  <div className="text-center">
                    <span className="text-4xl font-display font-bold text-warning">
                      {current.data.level.level_number}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-display font-bold text-foreground">
                  {current.data.level.title}
                </h2>
              </div>

              {current.data.level.perks && current.data.level.perks.length > 0 && (
                <div className="bg-muted/30 rounded-lg p-4 text-left max-w-sm mx-auto">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                    New Perks Unlocked
                  </p>
                  <ul className="space-y-2">
                    {current.data.level.perks.map((perk, i) => (
                      <li key={i} className="text-sm text-foreground flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-warning flex-shrink-0" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <ViperButton onClick={handleClose} className="bg-gradient-to-r from-warning to-primary">
                <Trophy className="h-4 w-4 mr-2" />
                Let's Go!
              </ViperButton>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </CelebrationContext.Provider>
  );
}