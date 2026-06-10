import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ViperButton } from "@/components/ui/viper-button";
import { Mail, ArrowLeft } from "lucide-react";

export default function VerifyEmail() {
  return (
    <AuthLayout eyebrow="Verify Email" title="Check your inbox." subtitle="">
      <div className="border border-border p-6 bg-card mb-6">
        <Mail className="h-5 w-5 text-primary mb-3" strokeWidth={1.5} />
        <p className="font-body text-sm text-foreground/85 leading-relaxed">
          We've sent a verification link to your inbox. Click it to activate your PitchViper
          account and continue to onboarding.
        </p>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 mb-6">
        — Didn't receive it? Check spam or try signing up again.
      </p>

      <Link to="/sign-in" className="block">
        <ViperButton variant="glass" className="w-full gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Sign In
        </ViperButton>
      </Link>
    </AuthLayout>
  );
}
