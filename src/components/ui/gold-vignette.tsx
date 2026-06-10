import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Lacquered Obsidian — barely-there radial gold vignette behind page H1s.
 * Wrap the hero greeting block to apply.
 */
export function GoldVignette({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("gold-vignette", className)}>{children}</div>;
}
