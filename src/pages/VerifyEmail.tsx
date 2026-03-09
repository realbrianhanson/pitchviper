import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ViperButton } from "@/components/ui/viper-button";
import { Mail, ArrowLeft } from "lucide-react";

export default function VerifyEmail() {
  return (
    <AuthLayout>
      <div className="flex flex-col items-center text-center space-y-6 py-4">
        {/* Animated mail icon */}
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
            <Mail className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-success border-2 border-background animate-bounce" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold text-foreground">
            Check your email
          </h2>
          <p className="text-muted-foreground max-w-sm">
            We've sent you a verification link. Click the link in your email to activate your PitchViper account.
          </p>
        </div>

        <div className="w-full space-y-3 pt-2">
          <p className="text-xs text-muted-foreground">
            Didn't receive it? Check your spam folder or try signing up again.
          </p>

          <Link to="/sign-in" className="block">
            <ViperButton variant="outline" className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </ViperButton>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
