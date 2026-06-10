import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

// Sovereign Editorial: hairline obsidian tiles, no blur, no glow, no gradients.
// Legacy `glass`/`gradient`/`glow` variants render as plain editorial tiles so
// older call sites adopt the new aesthetic without per-file edits.
const viperCardVariants = cva(
  "rounded-[2px] transition-colors duration-200 ease-out",
  {
    variants: {
      variant: {
        default: "bg-card border border-border",
        glass: "bg-card border border-border",
        gradient: "bg-card border border-border",
        elevated: "bg-card border border-border",
        glow: "bg-card border border-border",
      },
      hover: {
        none: "",
        lift: "hover:border-primary/40",
        glow: "hover:border-primary/40",
        scale: "",
      },
    },
    defaultVariants: {
      variant: "default",
      hover: "none",
    },
  }
);

export interface ViperCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof viperCardVariants> {}

const ViperCard = React.forwardRef<HTMLDivElement, ViperCardProps>(
  ({ className, variant, hover, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(viperCardVariants({ variant, hover, className }))}
      {...props}
    />
  )
);
ViperCard.displayName = "ViperCard";

const ViperCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
ViperCardHeader.displayName = "ViperCardHeader";

const ViperCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-display text-xl font-semibold leading-none tracking-tight text-foreground",
      className
    )}
    {...props}
  />
));
ViperCardTitle.displayName = "ViperCardTitle";

const ViperCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground font-body", className)}
    {...props}
  />
));
ViperCardDescription.displayName = "ViperCardDescription";

const ViperCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
ViperCardContent.displayName = "ViperCardContent";

const ViperCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
ViperCardFooter.displayName = "ViperCardFooter";

export {
  ViperCard,
  ViperCardHeader,
  ViperCardFooter,
  ViperCardTitle,
  ViperCardDescription,
  ViperCardContent,
  viperCardVariants,
};