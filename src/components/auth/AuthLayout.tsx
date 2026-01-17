import { ReactNode } from "react";
import { FloatingParticles } from "./FloatingParticles";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      {/* Animated gradient mesh background */}
      <div className="fixed inset-0 bg-background">
        <div className="absolute top-0 left-1/4 w-[400px] sm:w-[800px] h-[400px] sm:h-[800px] bg-primary/10 rounded-full blur-[100px] sm:blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-magenta/10 rounded-full blur-[80px] sm:blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-success/5 rounded-full blur-[60px] sm:blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Floating particles */}
      <FloatingParticles />

      {/* Auth card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-card/80 backdrop-blur-xl border border-glass-border rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-2xl shadow-primary/5">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6 sm:mb-8">
            <div className="flex items-center mb-2 sm:mb-3">
              <span className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">
                <span className="font-normal">Pitch</span>
                <span className="font-bold">Viper</span>
              </span>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm font-display tracking-wide">
              Where Closers Are Made
            </p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}