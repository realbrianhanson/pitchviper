import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ViperInput } from "@/components/ui/viper-input";
import { ViperButton } from "@/components/ui/viper-button";
import { cn } from "@/lib/utils";
import { Loader2, Ticket } from "lucide-react";

type UserRole = "rep" | "manager";

interface AccessData {
  promoCode: string;
  role: UserRole;
}

interface StepAccessProps {
  initialData: AccessData;
  onComplete: (data: AccessData) => void;
}

export function StepAccess({ initialData, onComplete }: StepAccessProps) {
  const { user, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [promoCode, setPromoCode] = useState(initialData.promoCode);
  const [role, setRole] = useState<UserRole>(initialData.role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    await signOut();
    window.location.href = "/sign-in";
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setLoading(true);

    try {
      // Validate promo code server-side
      const { data: promoResult, error: promoError } =
        await supabase.functions.invoke("validate-promo-code", {
          body: { promoCode: promoCode.trim() },
        });

      if (promoError || !promoResult?.valid) {
        setError("Invalid promo code. Please enter a valid code to continue.");
        toast({
          title: "Invalid Promo Code",
          description: "You need a valid promo code to access PitchViper.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Mark promo validated on profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ promo_validated: true })
        .eq("user_id", user.id);
      if (profileError) throw profileError;

      // Update role if manager (trigger created 'rep' by default)
      if (role === "manager") {
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: "manager" })
          .eq("user_id", user.id);
        if (roleError) throw roleError;
      } else {
        // Ensure rep (in case user came back and switched)
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: "rep" })
          .eq("user_id", user.id);
        if (roleError) throw roleError;
      }

      await refreshProfile();
      onComplete({ promoCode: promoCode.trim(), role });
    } catch (err: any) {
      setError(err.message || "Could not validate access. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">
          Access PitchViper
        </h2>
        <p className="text-muted-foreground">
          Enter your promo code and choose your role to continue.
        </p>
      </div>

      <form onSubmit={handleContinue} className="space-y-6">
        {/* Promo Code */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Promo Code <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <ViperInput
              type="text"
              placeholder="Enter your promo code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className={cn("pl-10", error && "border-destructive")}
              variant="glow"
              required
            />
          </div>
        </div>

        {/* Role Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">I am a...</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole("rep")}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all duration-200",
                role === "rep"
                  ? "border-primary bg-primary/10 shadow-glow-sm"
                  : "border-border bg-card/50 hover:border-primary/50"
              )}
            >
              <span className="text-2xl">🎯</span>
              <span
                className={cn(
                  "text-sm font-medium",
                  role === "rep" ? "text-primary" : "text-foreground"
                )}
              >
                Sales Rep
              </span>
            </button>
            <button
              type="button"
              onClick={() => setRole("manager")}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all duration-200",
                role === "manager"
                  ? "border-primary bg-primary/10 shadow-glow-sm"
                  : "border-border bg-card/50 hover:border-primary/50"
              )}
            >
              <span className="text-2xl">👑</span>
              <span
                className={cn(
                  "text-sm font-medium",
                  role === "manager" ? "text-primary" : "text-foreground"
                )}
              >
                Sales Manager
              </span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <ViperButton
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel & Sign Out
          </ViperButton>
          <ViperButton
            type="submit"
            className="flex-1"
            disabled={loading || !promoCode.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              "Continue"
            )}
          </ViperButton>
        </div>
      </form>
    </div>
  );
}
