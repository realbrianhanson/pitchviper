import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const viperCardVariants = cva(
  "rounded-lg transition-all duration-200 ease-out",
  {
    variants: {
      variant: {
        default: "bg-card border border-border",
        glass: "bg-card/70 backdrop-blur-xl border border-glass-border",
        gradient: "bg-card relative gradient-border",
        elevated: "bg-card border border-border shadow-lg shadow-background/50",
        glow: "bg-card border border-primary/30 shadow-glow-sm",
      },
      hover: {
        none: "",
        lift: "hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10",
        glow: "hover:shadow-glow-md hover:border-primary/50",
        scale: "hover:scale-[1.02]",
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