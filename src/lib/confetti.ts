import confetti, { type Options } from "canvas-confetti";

/**
 * Sovereign Editorial confetti palette.
 * Brushed-gold family + acid green + warm off-white for sparkle.
 * NEVER neon (no cyan, no magenta).
 */
export const BRAND_CONFETTI_COLORS = [
  "#E8C76F", // primary gold  hsl(42 73% 67%)
  "#D4A84A", // gold shade
  "#F5D982", // gold tint
  "#B8893A", // deep gold
  "#FFF1C2", // pale gold sparkle
  "#F5F1E8", // warm off-white
];

/**
 * Rare celebration accent — adds acid green for "victory" moments.
 */
export const BRAND_CONFETTI_VICTORY = [
  "#E8C76F",
  "#F5D982",
  "#9CFF6B", // acid green hsl(105 100% 71%)
  "#F5F1E8",
];

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Motion-safe wrapper around canvas-confetti. Silently no-ops when the user
 * has requested reduced motion. Callers should pass brand colors from this
 * module — the neon palette is forbidden.
 */
export function fireConfetti(options: Options = {}) {
  if (prefersReducedMotion()) return;
  return confetti({
    colors: BRAND_CONFETTI_COLORS,
    ...options,
  });
}
