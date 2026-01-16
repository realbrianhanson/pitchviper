import { ReactNode } from "react";
import { FloatingParticles } from "./FloatingParticles";
import { Zap } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient mesh background */}
      <div className="fixed inset-0 bg-background">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-magenta/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-success/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Floating particles */}
      <FloatingParticles />

      {/* Auth card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-card/80 backdrop-blur-xl border border-glass-border rounded-2xl p-8 shadow-2xl shadow-primary/5">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/30 shadow-glow-sm">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <span className="font-display text-3xl font-bold text-gradient">
                PitchViper
              </span>
            </div>
            <p className="text-muted-foreground text-sm font-display tracking-wide">
              Where Closers Are Made
            </p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}