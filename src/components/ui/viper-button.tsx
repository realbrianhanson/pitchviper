import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Sovereign Editorial: sharp 2px radius, no glow halos, hairline borders.
// Legacy `glass` variant aliases to an editorial outline.
const viperButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2px] text-sm font-medium font-display tracking-wide ring-offset-background transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        success:
          "bg-success text-success-foreground hover:bg-success/90",
        outline:
          "border border-border bg-transparent text-foreground hover:border-primary hover:text-primary",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-accent",
        link:
          "text-primary underline-offset-4 hover:underline",
        glass:
          "bg-transparent border border-border text-foreground hover:border-primary hover:text-primary",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-[2px] px-4 text-xs",
        lg: "h-12 rounded-[2px] px-8 text-base",
        xl: "h-14 rounded-[2px] px-10 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ViperButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof viperButtonVariants> {
  asChild?: boolean;
}

const ViperButton = React.forwardRef<HTMLButtonElement, ViperButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(viperButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
ViperButton.displayName = "ViperButton";

export { ViperButton, viperButtonVariants };