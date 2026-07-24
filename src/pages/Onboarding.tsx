import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { FilmGrain } from "@/components/ui/film-grain";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { StepAccess } from "@/components/onboarding/StepAccess";
import { StepProfile } from "@/components/onboarding/StepProfile";
import { StepTeam } from "@/components/onboarding/StepTeam";
import { StepComplete } from "@/components/onboarding/StepComplete";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { EditorialLoading } from "@/components/ui/editorial-skeleton";

type Step = 1 | 2 | 3 | 4;
type UserRole = "rep" | "manager";

interface AccessData {
  promoCode: string;
  role: UserRole;
}

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
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");

  const [accessData, setAccessData] = useState<AccessData>({
    promoCode: "",
    role: "rep",
  });

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

  // Initialize from auth profile (created by DB trigger)
  useEffect(() => {
    if (!user || authLoading) return;

    if (profile) {
      setFullName(profile.full_name || "");
      if (profile.onboarding_completed && profile.promo_validated) {
        navigate("/");
        return;
      }
      // Invited teammates arrive with promo_validated=true AND a team_id already set.
      // Pre-populate team data and skip the promo + team-selection steps.
      if (profile.promo_validated && profile.team_id) {
        setTeamData({ teamId: profile.team_id, teamName: null, teamCode: null });
        setStep(2);
      } else if (profile.promo_validated) {
        setStep(2);
      }
    }
    setLoading(false);
  }, [user, profile, authLoading, navigate]);

  const handleAccessComplete = (data: AccessData) => {
    setAccessData(data);
    setStep(2);
  };

  const handleProfileComplete = (data: ProfileData) => {
    setProfileData(data);
    // Invited teammates already have a team — skip the team-selection step.
    setStep(profile?.team_id ? 4 : 3);
  };

  const handleTeamComplete = (data: TeamData) => {
    setTeamData(data);
    setStep(4);
  };

  const handleFinalComplete = async () => {
    if (!user) return;

    try {
      // team_id is set server-side (team-membership function or invite trigger);
      // the client no longer has UPDATE privilege on that column.
      const { error } = await supabase
        .from("profiles")
        .update({
          avatar_url: profileData.avatarUrl,
          title: profileData.title,
          hire_date: profileData.hireDate || null,
          onboarding_completed: true,
        })
        .eq("user_id", user.id);

      if (error) throw error;

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
        <EditorialLoading label="Loading Profile" />
      </div>
    );
  }

  const isManager = accessData.role === "manager";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <FilmGrain />

      <div className="relative z-10 w-full max-w-lg">

        <div className="flex justify-center mb-6">
          <span className="font-display text-2xl tracking-tight text-foreground">
            <span className="font-normal">Pitch</span>
            <span className="font-bold">Viper</span>
          </span>
        </div>

        <OnboardingProgress currentStep={step} totalSteps={4} />

        <ViperCard variant="glass" className="overflow-hidden">
          <ViperCardContent className="p-8">
            {step === 1 && (
              <StepAccess
                initialData={accessData}
                onComplete={handleAccessComplete}
              />
            )}

            {step === 2 && (
              <StepProfile
                fullName={fullName}
                initialData={profileData}
                onComplete={handleProfileComplete}
              />
            )}

            {step === 3 && (
              <StepTeam
                isManager={isManager}
                onComplete={handleTeamComplete}
                onBack={() => setStep(2)}
              />
            )}

            {step === 4 && (
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
