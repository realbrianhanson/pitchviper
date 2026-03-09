import { useEffect, useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X, Trophy, Flame, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

interface DealCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  closerName: string;
  closerAvatar: string | null;
  dealValue: number;
  clientName: string;
  dealType?: string;
  dealsToday: number;
  soundEnabled?: boolean;
}

export function DealCelebration({
  isOpen,
  onClose,
  closerName,
  closerAvatar,
  dealValue,
  clientName,
  dealType,
  dealsToday,
  soundEnabled = true,
}: DealCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const fireConfetti = useCallback(() => {
    // Gold confetti from the left
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.1, y: 0.6 },
      colors: ["#FFD700", "#FFA500", "#00ff88", "#00f0ff"],
      angle: 60,
    });

    // Gold confetti from the right
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.9, y: 0.6 },
      colors: ["#FFD700", "#FFA500", "#00ff88", "#00f0ff"],
      angle: 120,
    });

    // Center burst
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors: ["#FFD700", "#FFA500", "#00ff88", "#00f0ff", "#ff00aa"],
      });
    }, 300);
  }, []);

  const playSound = useCallback(() => {
    if (!soundEnabled) return;
    
    // Play cash register sound (using Web Audio API for a simple "cha-ching")
    try {
      const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      // Create a simple "cha-ching" sound with oscillators
      const playTone = (freq: number, startTime: number, duration: number, type: OscillatorType = 'sine') => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = type;
        oscillator.frequency.value = freq;
        
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = audioContext.currentTime;
      
      // "Cha" - metallic ring
      playTone(2000, now, 0.15, 'triangle');
      playTone(2500, now, 0.1, 'sine');
      
      // "Ching" - bell sound
      playTone(3000, now + 0.15, 0.3, 'sine');
      playTone(3500, now + 0.15, 0.25, 'triangle');
      playTone(4000, now + 0.2, 0.2, 'sine');
      
    } catch (e) {
      // Audio playback not available in this environment
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      fireConfetti();
      playSound();

      // Auto-dismiss after 5 seconds
      const timeout = setTimeout(() => {
        onClose();
      }, 5000);

      return () => clearTimeout(timeout);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, fireConfetti, playSound, onClose]);

  if (!isOpen && !isVisible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-300",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      onClick={onClose}
    >
      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Celebration Content */}
      <div
        className={cn(
          "text-center transform transition-all duration-500",
          isOpen ? "scale-100 opacity-100" : "scale-90 opacity-0"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing background effect */}
        <div className="absolute inset-0 bg-gradient-radial from-success/20 via-transparent to-transparent pointer-events-none" />

        {/* Trophy Icon */}
        <div className="mb-6 animate-bounce">
          <Trophy className="h-16 w-16 text-warning mx-auto drop-shadow-[0_0_30px_rgba(255,170,0,0.5)]" />
        </div>

        {/* Avatar */}
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-success via-primary to-warning rounded-full blur-xl opacity-50 animate-pulse" />
          <Avatar className="h-32 w-32 ring-4 ring-success ring-offset-4 ring-offset-background relative">
            <AvatarImage src={closerAvatar || undefined} alt={closerName} />
            <AvatarFallback className="bg-success/20 text-success text-3xl font-bold">
              {getInitials(closerName)}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Name */}
        <h1 className="text-4xl md:text-5xl font-black text-foreground mb-2 tracking-tight">
          {closerName.split(" ")[0].toUpperCase()}
        </h1>
        <p className="text-2xl md:text-3xl font-bold text-success mb-6 animate-pulse">
          JUST CLOSED! 🎉
        </p>

        {/* Deal Value */}
        <div className="relative inline-block mb-4">
          <div className="absolute inset-0 bg-success/30 blur-2xl" />
          <div className="relative flex items-center justify-center gap-2 text-5xl md:text-7xl font-black text-success">
            <DollarSign className="h-12 w-12 md:h-16 md:w-16" />
            {dealValue.toLocaleString()}
          </div>
        </div>

        {/* Client Name */}
        <p className="text-xl text-muted-foreground mb-2">
          {clientName}
        </p>

        {/* Deal Type */}
        {dealType && (
          <p className="text-sm text-primary uppercase tracking-wider mb-6">
            {dealType}
          </p>
        )}

        {/* Deals Today Counter */}
        <div className="inline-flex items-center gap-2 bg-card/80 backdrop-blur-sm rounded-full px-6 py-3 border border-border/50">
          <Flame className="h-5 w-5 text-warning animate-pulse" />
          <span className="text-lg font-semibold text-foreground">
            {dealsToday} deal{dealsToday !== 1 ? "s" : ""} today!
          </span>
        </div>

        {/* Click to dismiss hint */}
        <p className="mt-8 text-sm text-muted-foreground animate-pulse">
          Click anywhere to dismiss
        </p>
      </div>
    </div>
  );
}
