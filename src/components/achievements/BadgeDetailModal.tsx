import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge as BadgeType, BadgeRarity, useGamification } from "@/hooks/useGamification";
import { Award, Lock, Share2, Download, X, Users } from "lucide-react";
import { ViperButton } from "@/components/ui/viper-button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface BadgeDetailModalProps {
  badge: BadgeType & { earned?: boolean; earned_at?: string };
  isOpen: boolean;
  onClose: () => void;
}

const rarityColors: Record<BadgeRarity, string> = {
  common: 'text-slate-400 border-slate-400 bg-slate-400/10',
  uncommon: 'text-green-500 border-green-500 bg-green-500/10',
  rare: 'text-blue-500 border-blue-500 bg-blue-500/10',
  epic: 'text-purple-500 border-purple-500 bg-purple-500/10',
  legendary: 'text-amber-400 border-amber-400 bg-amber-400/10',
};

const rarityGlows: Record<BadgeRarity, string> = {
  common: '',
  uncommon: 'shadow-[0_0_20px_rgba(34,197,94,0.3)]',
  rare: 'shadow-[0_0_30px_rgba(59,130,246,0.4)]',
  epic: 'shadow-[0_0_40px_rgba(168,85,247,0.5)] animate-pulse',
  legendary: 'shadow-[0_0_50px_rgba(245,158,11,0.6)] animate-[pulse_1.5s_ease-in-out_infinite]',
};

export function BadgeDetailModal({ badge, isOpen, onClose }: BadgeDetailModalProps) {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);

  const generateShareImage = async () => {
    setIsGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-achievement-image', {
        body: {
          badge_name: badge.name,
          badge_icon: badge.icon,
          badge_rarity: badge.rarity,
          user_name: 'You',
          achievement_date: badge.earned_at 
            ? format(new Date(badge.earned_at), 'MMM d, yyyy')
            : new Date().toLocaleDateString()
        }
      });

      if (error) throw error;
      
      if (data.success && data.image_url) {
        setShareImageUrl(data.image_url);
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
    link.download = `pitchviper-${badge.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = () => {
    setShareImageUrl(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <div className="space-y-6 py-4">
          {/* Badge icon */}
          <div className="flex justify-center">
            <div className={cn(
              "relative w-32 h-32 rounded-full flex items-center justify-center border-2",
              badge.earned ? rarityColors[badge.rarity] : 'border-muted bg-muted/30',
              badge.earned && rarityGlows[badge.rarity]
            )}>
              {badge.earned ? (
                <Award className={cn(
                  "h-16 w-16",
                  rarityColors[badge.rarity].split(' ')[0]
                )} />
              ) : (
                <Lock className="h-16 w-16 text-muted-foreground" />
              )}
              {badge.earned && badge.rarity === 'legendary' && (
                <div className="absolute -inset-2 rounded-full border border-amber-400/20 animate-ping" />
              )}
            </div>
          </div>

          {/* Badge info */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-display font-bold">{badge.name}</h2>
            <div className={cn(
              "inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase",
              rarityColors[badge.rarity]
            )}>
              {badge.rarity}
            </div>
            <p className="text-muted-foreground">{badge.description}</p>
          </div>

          {/* XP Reward */}
          <div className="flex items-center justify-center gap-2 py-2 px-4 bg-primary/10 rounded-lg mx-auto w-fit">
            <span className="text-primary font-semibold">+{badge.xp_reward} XP</span>
          </div>

          {/* Requirement */}
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              {badge.earned ? 'How you earned it' : 'How to earn'}
            </p>
            <p className="text-sm text-foreground">{badge.requirement_description}</p>
          </div>

          {/* Earned date */}
          {badge.earned && badge.earned_at && (
            <div className="text-center text-sm text-muted-foreground">
              Earned on {format(new Date(badge.earned_at), 'MMMM d, yyyy')}
            </div>
          )}

          {/* Rarity stat (mock) */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {badge.rarity === 'legendary' ? '0.5%' :
               badge.rarity === 'epic' ? '2%' :
               badge.rarity === 'rare' ? '8%' :
               badge.rarity === 'uncommon' ? '25%' : '60%'} of users have this badge
            </span>
          </div>

          {/* Share image */}
          {shareImageUrl && (
            <div className="rounded-lg overflow-hidden border border-border">
              <img src={shareImageUrl} alt="Achievement" className="w-full" />
            </div>
          )}

          {/* Actions */}
          {badge.earned && (
            <div className="flex gap-3 justify-center">
              {!shareImageUrl ? (
                <ViperButton
                  variant="outline"
                  onClick={generateShareImage}
                  disabled={isGeneratingImage}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  {isGeneratingImage ? 'Generating...' : 'Generate Share Image'}
                </ViperButton>
              ) : (
                <ViperButton variant="outline" onClick={downloadImage}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </ViperButton>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}