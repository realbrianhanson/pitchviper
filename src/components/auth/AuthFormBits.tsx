import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FieldLabel({
  htmlFor,
  children,
  action,
  className,
}: {
  htmlFor?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between mb-2", className)}>
      <label
        htmlFor={htmlFor}
        className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80"
      >
        {children}
      </label>
      {action}
    </div>
  );
}

export function AuthErrorNote({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <div className="border-l border-magenta pl-3 py-2 bg-magenta/5">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-magenta mb-0.5">
        — Error
      </p>
      <p className="font-body text-sm text-magenta">{message}</p>
    </div>
  );
}
