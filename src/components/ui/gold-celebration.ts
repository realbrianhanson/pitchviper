import confetti from "canvas-confetti";

/**
 * Sovereign-editorial celebration: a brief fall of gold-leaf squares.
 * Never rainbow. Respects prefers-reduced-motion.
 */
const GOLD_PALETTE = ["#E8C76F", "#D4A84A", "#F5D982", "#B8893A", "#FFF1C2"];

export function fireGoldCelebration() {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const base = {
    particleCount: 40,
    spread: 70,
    startVelocity: 32,
    gravity: 1.1,
    ticks: 180,
    scalar: 0.85,
    colors: GOLD_PALETTE,
    shapes: ["square"] as ("square" | "circle")[],
    disableForReducedMotion: true,
  };

  confetti({ ...base, origin: { x: 0.5, y: 0.5 } });
  window.setTimeout(
    () => confetti({ ...base, particleCount: 28, angle: 60, origin: { x: 0.1, y: 0.6 } }),
    180,
  );
  window.setTimeout(
    () => confetti({ ...base, particleCount: 28, angle: 120, origin: { x: 0.9, y: 0.6 } }),
    320,
  );
}
