import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { ViperInput } from "@/components/ui/viper-input";
import { ViperButton } from "@/components/ui/viper-button";
import { GoogleIcon } from "@/components/ui/google-icon";
import { FieldLabel, AuthErrorNote } from "@/components/auth/AuthFormBits";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check } from "lucide-react";

export default function SignUp() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // DB trigger auto-creates profile + default 'rep' role.
      // Promo code and role selection happen in onboarding.
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName },
        },
      });
      if (authError) throw authError;

      setSuccess(true);
      toast({ title: "Welcome to PitchViper.", description: "Check your email to verify your account." });
      setTimeout(() => navigate("/verify-email"), 1200);
    } catch (err: any) {
      setError(err.message);
      toast({ title: "Sign up failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast({ title: "Google sign up failed", description: result.error.message, variant: "destructive" });
      return;
    }
    if (result.redirected) return;
    navigate("/");
  };

  return (
    <AuthLayout
      eyebrow="Create Account"
      title="Earn your place."
      subtitle="The promo code and role come in onboarding."
    >
      <form onSubmit={handleSignUp} className="space-y-5">
        <div>
          <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
          <ViperInput
            id="fullName"
            type="text"
            placeholder="Jane Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <ViperInput
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <ViperInput
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <div className="mt-2">
            <PasswordStrengthIndicator password={password} />
          </div>
        </div>

        <AuthErrorNote message={error} />

        <ViperButton type="submit" className="w-full" disabled={loading || success}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account
            </>
          ) : success ? (
            <>
              <Check className="h-4 w-4" />
              Redirecting
            </>
          ) : (
            "Create Account"
          )}
        </ViperButton>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
              or
            </span>
          </div>
        </div>

        <ViperButton type="button" variant="glass" className="w-full" onClick={handleGoogleSignUp}>
          <GoogleIcon />
          Continue with Google
        </ViperButton>

        <p className="text-center font-body text-sm text-muted-foreground pt-2">
          Already signed up?{" "}
          <Link to="/sign-in" className="text-primary gold-underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
