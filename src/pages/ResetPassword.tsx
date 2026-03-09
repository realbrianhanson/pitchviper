import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ViperInput } from "@/components/ui/viper-input";
import { ViperButton } from "@/components/ui/viper-button";
import { useToast } from "@/hooks/use-toast";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { Lock, Loader2 } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we have the recovery token in the URL hash
    // Supabase automatically parses this and establishes a session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // We might need to wait a moment for onAuthStateChange to process the hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        if (!hashParams.has('access_token') && !hashParams.has('type')) {
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
      setError("Password must be at least 8 characters");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed.",
      });
      
      navigate("/");
    } catch (err: any) {
      console.error("Password update error:", err);
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
    <AuthLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold text-foreground">Set New Password</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Please enter your new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <ViperInput
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              variant="glow"
              required
            />
          </div>
          {password && <PasswordStrengthIndicator password={password} />}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <ViperButton
          type="submit"
          className="w-full font-display"
          disabled={loading || password.length < 8}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update Password"
          )}
        </ViperButton>
      </form>
    </AuthLayout>
  );
}
