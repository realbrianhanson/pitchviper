import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ViperButton } from "@/components/ui/viper-button";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { Zap, Target, Trophy, Rocket } from "lucide-react";

export default function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/sign-in");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-magenta/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 max-w-2xl w-full animate-fade-in">
        <ViperCard variant="glass" className="text-center">
          <ViperCardContent className="py-12 px-8">
            {/* Welcome Icon */}
            <div className="flex justify-center mb-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/30 shadow-glow-md animate-glow-pulse">
                <Zap className="h-10 w-10 text-primary" />
              </div>
            </div>

            {/* Welcome Text */}
            <h1 className="text-4xl font-display font-bold text-gradient mb-4">
              Welcome to PitchViper!
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
              You're about to unlock your full sales potential. Here's what awaits you:
            </p>

            {/* Features Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <div className="p-4 rounded-lg bg-accent/50 border border-border">
                <Target className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-display font-semibold text-foreground">Track Deals</h3>
                <p className="text-xs text-muted-foreground mt-1">Visual pipeline management</p>
              </div>
              <div className="p-4 rounded-lg bg-accent/50 border border-border">
                <Trophy className="h-8 w-8 text-warning mx-auto mb-2" />
                <h3 className="font-display font-semibold text-foreground">Compete</h3>
                <p className="text-xs text-muted-foreground mt-1">Real-time leaderboards</p>
              </div>
              <div className="p-4 rounded-lg bg-accent/50 border border-border">
                <Rocket className="h-8 w-8 text-success mx-auto mb-2" />
                <h3 className="font-display font-semibold text-foreground">Level Up</h3>
                <p className="text-xs text-muted-foreground mt-1">AI-powered coaching</p>
              </div>
            </div>

            {/* CTA */}
            <ViperButton
              size="xl"
              onClick={() => navigate("/")}
              className="font-display"
            >
              <Rocket className="h-5 w-5" />
              Enter Command Center
            </ViperButton>
          </ViperCardContent>
        </ViperCard>
      </div>
    </div>
  );
}