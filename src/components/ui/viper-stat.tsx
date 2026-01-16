import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const viperStatVariants = cva(
  "rounded-lg p-4 transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-card border border-border",
        glass: "bg-card/70 backdrop-blur-xl border border-glass-border",
        glow: "bg-card border border-primary/30 shadow-glow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ViperStatProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof viperStatVariants> {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
}

const ViperStat = React.forwardRef<HTMLDivElement, ViperStatProps>(
  ({ className, variant, label, value, change, changeLabel, icon, ...props }, ref) => {
    const isPositive = change !== undefined && change > 0;
    const isNegative = change !== undefined && change < 0;
    const isNeutral = change !== undefined && change === 0;

    return (
      <div
        ref={ref}
        className={cn(viperStatVariants({ variant, className }))}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-body">{label}</p>
            <p className="text-2xl font-display font-bold text-foreground mt-1">
              {value}
            </p>
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {isPositive && (
                  <>
                    <TrendingUp className="h-3 w-3 text-success" />
                    <span className="text-xs font-medium text-success">
                      +{change}%
                    </span>
                  </>
                )}
                {isNegative && (
                  <>
                    <TrendingDown className="h-3 w-3 text-destructive" />
                    <span className="text-xs font-medium text-destructive">
                      {change}%
                    </span>
                  </>
                )}
                {isNeutral && (
                  <>
                    <Minus className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      0%
                    </span>
                  </>
                )}
                {changeLabel && (
                  <span className="text-xs text-muted-foreground ml-1">
                    {changeLabel}
                  </span>
                )}
              </div>
            )}
          </div>
          {icon && (
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          )}
        </div>
      </div>
    );
  }
);
ViperStat.displayName = "ViperStat";

export { ViperStat, viperStatVariants };