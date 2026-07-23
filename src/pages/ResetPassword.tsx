import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ViperInput } from "@/components/ui/viper-input";
import { ViperButton } from "@/components/ui/viper-button";
import { FieldLabel, AuthErrorNote } from "@/components/auth/AuthFormBits";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isInvite =
    searchParams.get("flow") === "invite" ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type") === "invite");
  const { toast } = useToast();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        if (!hashParams.has("access_token") && !hashParams.has("type")) {
          toast({
            title: "Invalid Link",
            description: "Your password reset link is invalid or has expired.",
            variant: "destructive",
          });
          navigate("/sign-in");
        }
      }
    };
    checkSession();
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: updated, error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      const currentMeta = (updated?.user?.user_metadata ?? {}) as Record<string, unknown>;
      const inviteSource = currentMeta.invite_source;
      const shouldOnboard = isInvite || inviteSource === "team_manager";

      // Clear the invite marker so HomeGate stops routing back to this page.
      // Keep every other metadata field (full_name, etc.) intact.
      if (shouldOnboard && inviteSource) {
        const { invite_source: _drop, ...remaining } = currentMeta;
        const { error: metaError } = await supabase.auth.updateUser({ data: remaining });
        if (metaError) {
          setError("Password saved, but we couldn't finish onboarding setup. Please refresh and try again.");
          toast({
            title: "Almost there",
            description: "Password saved. Please refresh and sign in again to continue.",
            variant: "destructive",
          });
          return;
        }
      }

      toast({
        title: shouldOnboard ? "Password set." : "Password updated.",
        description: shouldOnboard
          ? "Welcome to PitchViper — let's finish setting up your profile."
          : "Your password has been changed.",
      });
      navigate(shouldOnboard ? "/onboarding" : "/");
    } catch (err: any) {
      setError(err.message || "Failed to update password");
      toast({
        title: "Error",
        description: err.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow={isInvite ? "Welcome to PitchViper" : "Reset Password"}
      title={isInvite ? "Set your password." : "Set a new password."}
      subtitle={
        isInvite
          ? "You've been invited to your team. Choose a password to get started."
          : "Choose something memorable but unguessable."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <FieldLabel htmlFor="password">New Password</FieldLabel>
          <ViperInput
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {password && (
            <div className="mt-2">
              <PasswordStrengthIndicator password={password} />
            </div>
          )}
        </div>

        <AuthErrorNote message={error} />

        <ViperButton type="submit" className="w-full" disabled={loading || password.length < 8}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating
            </>
          ) : (
            "Update Password"
          )}
        </ViperButton>
      </form>
    </AuthLayout>
  );
}
