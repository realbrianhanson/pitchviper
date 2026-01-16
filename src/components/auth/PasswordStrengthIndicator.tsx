import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const getStrength = (pwd: string): { level: number; label: string; color: string } => {
    if (!pwd) return { level: 0, label: "", color: "" };
    
    let score = 0;
    
    // Length check
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    
    // Character variety checks
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    
    if (score <= 2) {
      return { level: 1, label: "Weak", color: "bg-destructive" };
    } else if (score <= 4) {
      return { level: 2, label: "Medium", color: "bg-warning" };
    } else {
      return { level: 3, label: "Strong", color: "bg-success" };
    }
  };

  const strength = getStrength(password);

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((level) => (
          <div
            key={level}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              level <= strength.level ? strength.color : "bg-muted"
            )}
          />
        ))}
      </div>
      <p
        className={cn(
          "text-xs font-medium transition-colors",
          strength.level === 1 && "text-destructive",
          strength.level === 2 && "text-warning",
          strength.level === 3 && "text-success"
        )}
      >
        Password strength: {strength.label}
      </p>
    </div>
  );
}