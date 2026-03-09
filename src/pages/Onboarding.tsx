import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { FloatingParticles } from "@/components/auth/FloatingParticles";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { StepProfile } from "@/components/onboarding/StepProfile";
import { StepTeam } from "@/components/onboarding/StepTeam";
import { StepComplete } from "@/components/onboarding/StepComplete";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { Loader2 } from "lucide-react";

type Step = 1 | 2 | 3;

interface ProfileData {
  avatarUrl: string | null;
  title: string;
  hireDate: string;
}

interface TeamData {
  teamId: string | null;
  teamName: string | null;
  teamCode: string | null;
}

export default function Onboarding() {
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [isManager, setIsManager] = useState(false);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    avatarUrl: null,
    title: "",
    hireDate: "",
  });
  
  const [teamData, setTeamData] = useState<TeamData>({
    teamId: null,
    teamName: null,
    teamCode: null,
  });

  // Load existing profile data
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        // Get profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          setFullName(profile.full_name);
          if (profile.onboarding_completed) {
            navigate("/");
            return;
          }
        }

        // Check if manager
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (roles?.some(r => r.role === "manager")) {
          setIsManager(true);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user, navigate]);


  const handleProfileComplete = (data: ProfileData) => {
    setProfileData(data);
    setStep(2);
  };

  const handleTeamComplete = (data: TeamData) => {
    setTeamData(data);
    setStep(3);
  };

  const handleFinalComplete = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          avatar_url: profileData.avatarUrl,
          title: profileData.title,
          hire_date: profileData.hireDate || null,
          team_id: teamData.teamId,
          onboarding_completed: true,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      // Refresh profile in AuthContext so ProtectedRoute sees updated onboarding_completed
      await refreshProfile();

      toast({
        title: "Welcome aboard! 🎉",
        description: "Your profile is all set. Let's get started!",
      });
      navigate("/");
    } catch (err: any) {
      console.error("Error saving profile:", err);
      toast({
        title: "Save failed",
        description: err.message || "Could not save your profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient mesh background */}
      <div className="fixed inset-0 bg-background">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-magenta/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-success/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <FloatingParticles />

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <span className="font-display text-2xl tracking-tight text-foreground">
            <span className="font-normal">Pitch</span>
            <span className="font-bold">Viper</span>
          </span>
        </div>

        {/* Progress */}
        <OnboardingProgress currentStep={step} totalSteps={3} />

        {/* Card */}
        <ViperCard variant="glass" className="overflow-hidden">
          <ViperCardContent className="p-8">
            {step === 1 && (
              <StepProfile
                fullName={fullName}
                initialData={profileData}
                onComplete={handleProfileComplete}
              />
            )}

            {step === 2 && (
              <StepTeam
                isManager={isManager}
                onComplete={handleTeamComplete}
                onBack={() => setStep(1)}
              />
            )}

            {step === 3 && (
              <StepComplete
                teamName={teamData.teamName}
                onComplete={handleFinalComplete}
              />
            )}
          </ViperCardContent>
        </ViperCard>
      </div>
    </div>
  );
}