import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const viperButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium font-display tracking-wide ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-glow-sm hover:-translate-y-0.5 active:translate-y-0",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-glow-magenta hover:-translate-y-0.5 active:translate-y-0",
        success:
          "bg-success text-success-foreground hover:bg-success/90 hover:shadow-glow-success hover:-translate-y-0.5 active:translate-y-0",
        outline:
          "border border-primary/50 bg-transparent text-primary hover:bg-primary/10 hover:border-primary hover:shadow-glow-sm",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:-translate-y-0.5 active:translate-y-0",
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-accent",
        link:
          "text-primary underline-offset-4 hover:underline",
        glass:
          "bg-card/50 backdrop-blur-sm border border-glass-border text-foreground hover:bg-card/70 hover:border-primary/30 hover:-translate-y-0.5",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-md px-4 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-lg px-10 text-lg",
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