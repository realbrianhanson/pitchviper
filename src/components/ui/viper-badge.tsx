import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const viperBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold font-display tracking-wide transition-all duration-200",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/20 text-primary",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive/20 text-destructive",
        success:
          "border-transparent bg-success/20 text-success",
        warning:
          "border-transparent bg-warning/20 text-warning",
        magenta:
          "border-transparent bg-magenta/20 text-magenta",
        outline:
          "border-primary/50 text-primary bg-transparent",
        glass:
          "border-glass-border bg-card/50 backdrop-blur-sm text-foreground",
      },
      glow: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        variant: "default",
        glow: true,
        className: "shadow-glow-sm",
      },
      {
        variant: "success",
        glow: true,
        className: "shadow-glow-success",
      },
      {
        variant: "destructive",
        glow: true,
        className: "shadow-glow-magenta",
      },
      {
        variant: "magenta",
        glow: true,
        className: "shadow-glow-magenta",
      },
    ],
    defaultVariants: {
      variant: "default",
      glow: false,
    },
  }
);

export interface ViperBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof viperBadgeVariants> {}

function ViperBadge({ className, variant, glow, ...props }: ViperBadgeProps) {
  return (
    <div
      className={cn(viperBadgeVariants({ variant, glow }), className)}
      {...props}
    />
  );
}

export { ViperBadge, viperBadgeVariants };