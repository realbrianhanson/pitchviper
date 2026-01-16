import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const viperInputVariants = cva(
  "flex w-full rounded-lg border bg-input px-4 py-3 text-sm font-body text-foreground shadow-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-border focus:border-primary focus:ring-2 focus:ring-primary/20",
        glass:
          "border-glass-border bg-card/50 backdrop-blur-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
        glow:
          "border-primary/30 focus:border-primary focus:shadow-glow-sm focus:ring-2 focus:ring-primary/30",
        error:
          "border-destructive/50 focus:border-destructive focus:ring-2 focus:ring-destructive/20",
        success:
          "border-success/50 focus:border-success focus:ring-2 focus:ring-success/20",
      },
      inputSize: {
        default: "h-11",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
);

export interface ViperInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof viperInputVariants> {}

const ViperInput = React.forwardRef<HTMLInputElement, ViperInputProps>(
  ({ className, type, variant, inputSize, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(viperInputVariants({ variant, inputSize, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
ViperInput.displayName = "ViperInput";

export { ViperInput, viperInputVariants };