import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ViperButton } from "@/components/ui/viper-button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface TourStep {
  target: string; // CSS selector
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
}

interface OnboardingTourContextType {
  isActive: boolean;
  currentStep: number;
  startTour: () => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
}

const OnboardingTourContext = createContext<OnboardingTourContextType | undefined>(undefined);

const defaultTourSteps: TourStep[] = [
  {
    target: "[data-tour='dashboard']",
    title: "Welcome to Your Command Center! 🎯",
    description: "This is your dashboard where you can see your daily stats, streak, and quick actions at a glance.",
    position: "bottom",
  },
  {
    target: "[data-tour='leaderboard']",
    title: "Compete & Win 🏆",
    description: "Check the leaderboard to see how you stack up against your teammates. Climb the ranks!",
    position: "right",
  },
  {
    target: "[data-tour='pipeline']",
    title: "Manage Your Deals 💰",
    description: "Track all your deals in the pipeline. Drag and drop to update stages and get AI coaching.",
    position: "right",
  },
  {
    target: "[data-tour='roleplay']",
    title: "Practice Makes Perfect 🎭",
    description: "Sharpen your skills in the Roleplay Arena with AI-powered practice scenarios.",
    position: "right",
  },
  {
    target: "[data-tour='log-call']",
    title: "Log Your Calls 📞",
    description: "Click here to quickly log calls and track your activity. Every call earns you XP!",
    position: "bottom",
  },
];

interface OnboardingTourProviderProps {
  children: ReactNode;
  steps?: TourStep[];
}

export function OnboardingTourProvider({ children, steps = defaultTourSteps }: OnboardingTourProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(true);
  const { user, profile, profileLoaded } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const seen = localStorage.getItem("onboarding-tour-completed");
    if (seen) {
      setHasSeenTour(true);
      return;
    }
    setHasSeenTour(false);

    // Auto-start ONLY for an authenticated, onboarded user on the protected /app route.
    // Public pages ("/", "/demo") and auth pages must never auto-start the tour.
    const eligible =
      !!user &&
      profileLoaded &&
      !!profile &&
      profile.onboarding_completed === true &&
      location.pathname === "/app";

    if (!eligible) return;

    const timer = setTimeout(() => {
      setIsActive(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [user, profile, profileLoaded, location.pathname]);

  const startTour = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  const endTour = () => {
    setIsActive(false);
    setCurrentStep(0);
    localStorage.setItem("onboarding-tour-completed", "true");
    setHasSeenTour(true);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      endTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <OnboardingTourContext.Provider value={{ isActive, currentStep, startTour, endTour, nextStep, prevStep }}>
      {children}
      
      <AnimatePresence>
        {isActive && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[200]"
              onClick={endTour}
            />

            {/* Tour tooltip */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[201] w-full max-w-md px-4"
            >
              <div className="bg-card border border-border rounded-xl shadow-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="text-xs text-muted-foreground">
                      Step {currentStep + 1} of {steps.length}
                    </span>
                  </div>
                  <button
                    onClick={endTour}
                    className="p-1 rounded hover:bg-accent transition-colors"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {steps[currentStep].title}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {steps[currentStep].description}
                </p>

                {/* Progress dots */}
                <div className="flex items-center justify-center gap-1.5 mb-4">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        index === currentStep 
                          ? "w-6 bg-primary" 
                          : index < currentStep
                          ? "w-1.5 bg-primary/50"
                          : "w-1.5 bg-muted"
                      )}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <ViperButton
                    variant="ghost"
                    size="sm"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </ViperButton>

                  <ViperButton
                    size="sm"
                    onClick={nextStep}
                    className="gap-1"
                  >
                    {currentStep === steps.length - 1 ? "Get Started!" : "Next"}
                    {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4" />}
                  </ViperButton>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </OnboardingTourContext.Provider>
  );
}

export function useOnboardingTour() {
  const context = useContext(OnboardingTourContext);
  if (!context) {
    throw new Error("useOnboardingTour must be used within OnboardingTourProvider");
  }
  return context;
}

// Tip of the day component
export function TipOfTheDay() {
  const [dismissed, setDismissed] = useState(false);
  const [tip, setTip] = useState<{ title: string; content: string } | null>(null);

  const tips = [
    { title: "Quick Tip 💡", content: "Use keyboard shortcut 'L' to quickly log a call from anywhere!" },
    { title: "Did you know? 🤔", content: "Completing the Daily Gauntlet gives you bonus XP and helps maintain your streak." },
    { title: "Pro Tip 🎯", content: "Check your deal momentum scores - red deals need attention before they go cold!" },
    { title: "Level Up Faster ⚡", content: "Earning badges gives you XP boosts. Check the Achievements page for available badges." },
    { title: "Stay Sharp 🏆", content: "Practice objection handling in the Vault to improve your close rate." },
  ];

  useEffect(() => {
    const lastDismissed = localStorage.getItem("tip-dismissed-date");
    const today = new Date().toDateString();
    
    if (lastDismissed !== today) {
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      setTip(randomTip);
      setDismissed(false);
    } else {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("tip-dismissed-date", new Date().toDateString());
  };

  if (dismissed || !tip) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-primary text-sm">{tip.title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{tip.content}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded hover:bg-primary/20 transition-colors"
        >
          <X className="h-4 w-4 text-primary" />
        </button>
      </div>
    </motion.div>
  );
}
