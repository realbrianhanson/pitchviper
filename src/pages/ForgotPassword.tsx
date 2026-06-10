import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ViperInput } from "@/components/ui/viper-input";
import { ViperButton } from "@/components/ui/viper-button";
import { FieldLabel } from "@/components/auth/AuthFormBits";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Check } from "lucide-react";

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
      toast({ title: "Check your email.", description: "We've sent you a password reset link." });
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
    <AuthLayout
      eyebrow="Forgot Password"
      title="Reset and return."
      subtitle="We'll send a link to your inbox."
    >
      <Link
        to="/sign-in"
        className="inline-flex items-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft className="mr-2 h-3 w-3" />
        Back to sign in
      </Link>

      {success ? (
        <div className="border border-border p-6 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Check className="h-4 w-4 text-primary" />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
              — Sent
            </p>
          </div>
          <p className="font-display italic text-2xl text-foreground mb-2">Check your inbox.</p>
          <p className="font-body text-sm text-muted-foreground">
            We've sent a reset link to <span className="text-foreground">{email}</span>. The link
            expires in one hour.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
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

          <ViperButton type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending
              </>
            ) : (
              "Send Reset Link"
            )}
          </ViperButton>
        </form>
      )}
    </AuthLayout>
  );
}
