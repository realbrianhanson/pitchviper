import { cn } from "@/lib/utils";

/**
 * Hairline shimmer skeleton for the Sovereign Editorial system.
 * Use instead of spinners — preserves layout, matches the grid.
 */
export function EditorialSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted/40 border border-border/60",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r",
        "before:from-transparent before:via-foreground/[0.04] before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

interface SkeletonGridProps {
  count?: number;
  columns?: number;
  height?: string;
}

export function EditorialSkeletonGrid({
  count = 4,
  columns = 4,
  height = "h-24",
}: SkeletonGridProps) {
  return (
    <div
      className="grid gap-px bg-border border border-border"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn("bg-background p-5", height)}>
          <EditorialSkeleton className="h-3 w-16 mb-3" />
          <EditorialSkeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

interface LoadingPanelProps {
  label?: string;
  className?: string;
}

/** Centered editorial loading state — replaces spinner. */
export function EditorialLoading({ label = "Loading", className }: LoadingPanelProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16", className)}>
      <div className="relative h-px w-32 overflow-hidden bg-border mb-4">
        <div className="absolute inset-y-0 w-12 bg-primary animate-[marquee_1.5s_linear_infinite]" />
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
