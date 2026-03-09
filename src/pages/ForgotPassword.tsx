import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ViperInput } from "@/components/ui/viper-input";
import { ViperButton } from "@/components/ui/viper-button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Loader2, Mail, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccess(true);
      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to send reset link",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6">
        <Link to="/sign-in" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to sign in
        </Link>
        <h2 className="text-2xl font-display font-bold text-foreground">Reset Password</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {success ? (
          <div className="p-4 rounded-lg bg-success/10 border border-success/30 text-center">
            <p className="text-success font-medium mb-2">Email sent!</p>
            <p className="text-sm text-success/80">
              Please check your inbox for the password reset link.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <ViperInput
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  variant="glow"
                  required
                />
              </div>
            </div>

            <ViperButton
              type="submit"
              className="w-full font-display"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                "Send Reset Link"
              )}
            </ViperButton>
          </>
        )}
      </form>
    </AuthLayout>
  );
}
