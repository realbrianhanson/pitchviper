import { useEffect, useRef, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NumberFlashProps {
  /** Numeric value used for change detection. */
  value: number;
  /** Rendered children (formatted value). Defaults to the number. */
  children?: ReactNode;
  className?: string;
}

/**
 * Wraps a number/value and flashes it in primary gold for ~400ms
 * whenever the underlying value increases. Subtle, settles fast.
 */
export function NumberFlash({ value, children, className }: NumberFlashProps) {
  const prev = useRef<number>(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (value > prev.current) {
      setFlash(true);
      const t = window.setTimeout(() => setFlash(false), 420);
      prev.current = value;
      return () => window.clearTimeout(t);
    }
    prev.current = value;
  }, [value]);

  return (
    <span
      className={cn(
        "transition-colors duration-[420ms] ease-out",
        flash && "text-primary",
        className,
      )}
    >
      {children ?? value}
    </span>
  );
}
