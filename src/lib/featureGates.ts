// Set of Growth-tier-only routes. Kept in sync with server enforcement.
export const GROWTH_ROUTES = new Set<string>([
  "/ai-coach",
  "/manager/competitions",
]);

export function isGrowthRoute(url: string): boolean {
  return GROWTH_ROUTES.has(url);
}
