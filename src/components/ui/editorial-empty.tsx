import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EditorialEmptyProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Sovereign Editorial empty state.
 * Hairline border, serif headline, mono eyebrow + CTA.
 */
export function EditorialEmpty({
  eyebrow = "No data",
  title,
  description,
  action,
  icon,
  className,
  size = "md",
}: EditorialEmptyProps) {
  const padding = size === "sm" ? "py-10 px-6" : size === "lg" ? "py-24 px-10" : "py-16 px-8";
  const headline = size === "sm" ? "text-2xl" : size === "lg" ? "text-5xl" : "text-3xl md:text-4xl";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center border border-dashed border-border bg-background",
        padding,
        className,
      )}
    >
      {icon && (
        <div className="mb-5 text-muted-foreground/60">{icon}</div>
      )}
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 mb-3">
        — {eyebrow}
      </p>
      <h3 className={cn("font-display italic leading-[1.1] max-w-md", headline)}>
        {title}
      </h3>
      {description && (
        <p className="font-body text-sm text-muted-foreground/80 mt-3 max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
