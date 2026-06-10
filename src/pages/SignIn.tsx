import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ViperInput } from "@/components/ui/viper-input";
import { ViperButton } from "@/components/ui/viper-button";
import { GoogleIcon } from "@/components/ui/google-icon";
import { FieldLabel, AuthErrorNote } from "@/components/auth/AuthFormBits";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check } from "lucide-react";

export default function SignIn() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      setSuccess(true);
      toast({ title: "Welcome back.", description: "You've signed in successfully." });
      setTimeout(() => navigate("/"), 900);
    } catch (err: any) {
      setError(err.message);
      toast({ title: "Sign in failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast({ title: "Google sign in failed", description: result.error.message, variant: "destructive" });
      return;
    }
    if (result.redirected) return;
    navigate("/");
  };

  return (
    <AuthLayout eyebrow="Sign In" title="Welcome back." subtitle="The territory awaits.">
      <form onSubmit={handleSignIn} className="space-y-5">
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
          <FieldLabel
            htmlFor="password"
            action={
              <Link to="/forgot-password" className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary gold-underline">
                Forgot
              </Link>
            }
          >
            Password
          </FieldLabel>
          <ViperInput
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <AuthErrorNote message={error} />

        <ViperButton type="submit" className="w-full" disabled={loading || success}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in
            </>
          ) : success ? (
            <>
              <Check className="h-4 w-4" />
              Redirecting
            </>
          ) : (
            "Sign In"
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

        <ViperButton type="button" variant="glass" className="w-full" onClick={handleGoogleSignIn}>
          <GoogleIcon />
          Continue with Google
        </ViperButton>

        <p className="text-center font-body text-sm text-muted-foreground pt-2">
          New here?{" "}
          <Link to="/sign-up" className="text-primary gold-underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
