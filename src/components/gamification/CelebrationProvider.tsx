import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useGamification, NewBadgeResult, Level } from '@/hooks/useGamification';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import confetti from 'canvas-confetti';
import { Trophy, Star, Sparkles, ArrowUp, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CelebrationData {
  type: 'badge' | 'level';
  badge?: NewBadgeResult;
  level?: Level;
}

interface CelebrationContextType {
  celebrate: (data: CelebrationData) => void;
  celebrateBadges: (badges: NewBadgeResult[]) => void;
  celebrateLevelUp: (level: Level) => void;
}

const CelebrationContext = createContext<CelebrationContextType | null>(null);

export function useCelebration() {
  const context = useContext(CelebrationContext);
  if (!context) {
    throw new Error('useCelebration must be used within CelebrationProvider');
  }
  return context;
}

interface CelebrationProviderProps {
  children: ReactNode;
}

export function CelebrationProvider({ children }: CelebrationProviderProps) {
  const { getRarityColor } = useGamification();
  const [queue, setQueue] = useState<CelebrationData[]>([]);
  const [current, setCurrent] = useState<CelebrationData | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen && queue.length > 0) {
      const [next, ...rest] = queue;
      setCurrent(next);
      setQueue(rest);
      setIsOpen(true);
      triggerConfetti(next.type);
    }
  }, [isOpen, queue]);

  const triggerConfetti = (type: 'badge' | 'level') => {
    const colors = type === 'level' 
      ? ['#00f0ff', '#00ff88', '#ffaa00'] 
      : ['#00f0ff', '#ff00aa'];

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors
    });

    if (type === 'level') {
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors
        });
      }, 250);
    }
  };

  const celebrate = (data: CelebrationData) => {
    setQueue(prev => [...prev, data]);
  };

  const celebrateBadges = (badges: NewBadgeResult[]) => {
    badges.forEach(badge => {
      celebrate({ type: 'badge', badge });
    });
  };

  const celebrateLevelUp = (level: Level) => {
    celebrate({ type: 'level', level });
  };

  const handleClose = () => {
    setIsOpen(false);
    setCurrent(null);
  };

  return (
    <CelebrationContext.Provider value={{ celebrate, celebrateBadges, celebrateLevelUp }}>
      {children}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border text-center overflow-hidden">
          {current?.type === 'badge' && current.badge && (
            <div className="py-6 space-y-4">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                <div className="relative flex items-center justify-center w-full h-full bg-gradient-to-br from-primary/30 to-secondary/30 rounded-full border-2 border-primary">
                  <Award className="h-10 w-10 text-primary" />
                </div>
              </div>

              <div>
                <p className="text-sm text-primary font-medium mb-1">Badge Earned!</p>
                <h2 className="text-2xl font-bold text-foreground font-outfit">
                  {current.badge.badgeName}
                </h2>
              </div>

              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 text-warning" />
                <span className="text-warning font-semibold">+{current.badge.xpReward} XP</span>
              </div>

              <Button onClick={handleClose} className="mt-4">
                Awesome!
              </Button>
            </div>
          )}

          {current?.type === 'level' && current.level && (
            <div className="py-6 space-y-4">
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 bg-warning/20 rounded-full animate-pulse" />
                <div className="relative flex items-center justify-center w-full h-full bg-gradient-to-br from-warning/30 to-primary/30 rounded-full border-2 border-warning">
                  <div className="text-center">
                    <ArrowUp className="h-6 w-6 text-warning mx-auto mb-1" />
                    <span className="text-2xl font-bold text-warning">{current.level.level_number}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-warning font-medium mb-1">Level Up!</p>
                <h2 className="text-3xl font-bold text-foreground font-outfit">
                  {current.level.title}
                </h2>
              </div>

              {current.level.perks && current.level.perks.length > 0 && (
                <div className="space-y-2 bg-muted/30 rounded-lg p-4 text-left">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">New Perks Unlocked</p>
                  <ul className="space-y-1">
                    {current.level.perks.map((perk, i) => (
                      <li key={i} className="text-sm text-foreground flex items-center gap-2">
                        <Star className="h-3 w-3 text-warning" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button onClick={handleClose} className="mt-4 bg-gradient-to-r from-warning to-primary">
                <Trophy className="h-4 w-4 mr-2" />
                Let's Go!
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </CelebrationContext.Provider>
  );
}
