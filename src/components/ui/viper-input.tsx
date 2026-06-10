import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

// Sovereign Editorial: hairline borders, gold focus ring, sharp 2px radius.
// Legacy `glass` and `glow` variants are kept as aliases of the editorial
// default so older call sites quietly adopt the new aesthetic without edits.
const viperInputVariants = cva(
  "flex w-full rounded-[2px] border bg-input px-4 py-3 text-sm font-body text-foreground transition-colors duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-border focus:border-primary focus:ring-1 focus:ring-primary/60",
        glass:
          "border-border focus:border-primary focus:ring-1 focus:ring-primary/60",
        glow:
          "border-border focus:border-primary focus:ring-1 focus:ring-primary/60",
        error:
          "border-destructive/60 focus:border-destructive focus:ring-1 focus:ring-destructive/40",
        success:
          "border-success/60 focus:border-success focus:ring-1 focus:ring-success/40",
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
