import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { ViperInput } from "@/components/ui/viper-input";
import { ViperButton } from "@/components/ui/viper-button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Loader2, User, Mail, Lock, Users, Chrome } from "lucide-react";

type UserRole = "rep" | "manager";

export default function SignUp() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [role, setRole] = useState<UserRole>("rep");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No user returned from signup");

      // Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: authData.user.id,
          full_name: fullName,
          team_code: teamCode || null,
        });

      if (profileError) throw profileError;

      // Create user role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: role,
        });

      if (roleError) throw roleError;

      // Success!
      setSuccess(true);
      toast({
        title: "Welcome to PitchViper!",
        description: "Your account has been created successfully.",
      });

      // Flash green and redirect
      setTimeout(() => {
        navigate("/onboarding");
      }, 1500);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Sign up failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/onboarding`,
      },
    });

    if (error) {
      toast({
        title: "Google sign in failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSignUp} className="space-y-5">
        {/* Full Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <ViperInput
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={cn("pl-10", error && "animate-pulse border-destructive")}
              variant="glow"
              required
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <ViperInput
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn("pl-10", error && "animate-pulse border-destructive")}
              variant="glow"
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <ViperInput
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn("pl-10", error && "animate-pulse border-destructive")}
              variant="glow"
              required
              minLength={6}
            />
          </div>
          <PasswordStrengthIndicator password={password} />
        </div>

        {/* Team Code */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Team Code <span className="text-muted-foreground">(optional)</span>
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <ViperInput
              type="text"
              placeholder="Enter team code to join"
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value)}
              className="pl-10"
              variant="glass"
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
              <span className={cn("text-sm font-medium", role === "rep" ? "text-primary" : "text-foreground")}>
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
              <span className={cn("text-sm font-medium", role === "manager" ? "text-primary" : "text-foreground")}>
                Sales Manager
              </span>
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 animate-pulse">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <ViperButton
          type="submit"
          className={cn(
            "w-full font-display",
            success && "bg-success hover:bg-success shadow-glow-success"
          )}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : success ? (
            "Success! Redirecting..."
          ) : (
            "Create Account"
          )}
        </ViperButton>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">or continue with</span>
          </div>
        </div>

        {/* Google Sign In */}
        <ViperButton
          type="button"
          variant="glass"
          className="w-full"
          onClick={handleGoogleSignIn}
        >
          <Chrome className="h-4 w-4" />
          Google
        </ViperButton>

        {/* Sign In Link */}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/sign-in" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}