/**
 * Provider-neutral sales-system registry.
 *
 * The app talks about a "Sales system" or "Phone system" — a small
 * typed domain layer keeps Dialer.io / manual / GoHighLevel / legacy
 * Aloware handling out of individual components.
 *
 * IMPORTANT: There is no public Dialer.io API/webhook contract available
 * to us. "Native sync" is intentionally NOT claimed for dialer_io until
 * such a contract exists and is implemented server-side.
 */

export type SalesSystemId = "dialer_io" | "manual" | "gohighlevel" | "legacy_aloware";

export interface SalesSystemMeta {
  id: SalesSystemId;
  label: string;
  tagline: string;
  external_app_url?: string;
  /** True when the app has a real, verified sync/webhook adapter today. */
  hasNativeAdapter: boolean;
  /** Manager-facing status copy when this system is selected. */
  selectedStatus: string;
  /** Whether managers can select this option in the Phone system UI. */
  selectable: boolean;
  /** Whether the option is featured/recommended in the Phone system UI. */
  recommended?: boolean;
}

export const SALES_SYSTEM_REGISTRY: Record<SalesSystemId, SalesSystemMeta> = {
  dialer_io: {
    id: "dialer_io",
    label: "Dialer.io",
    tagline: "Modern power-dialer with CRM, reporting and Zapier/Make workflows.",
    external_app_url: "https://app.dialer.io",
    hasNativeAdapter: false,
    selectedStatus: "Dialer.io selected — native sync requires an integration handoff.",
    selectable: true,
    recommended: true,
  },
  manual: {
    id: "manual",
    label: "Manual workflow",
    tagline: "Log calls, deals and outcomes directly inside PitchViper.",
    hasNativeAdapter: true,
    selectedStatus: "Manual logging enabled.",
    selectable: true,
  },
  gohighlevel: {
    id: "gohighlevel",
    label: "GoHighLevel",
    tagline: "Receive pipeline and revenue events via GHL webhooks.",
    hasNativeAdapter: true,
    selectedStatus: "GoHighLevel webhook active.",
    selectable: true,
  },
  legacy_aloware: {
    id: "legacy_aloware",
    label: "Aloware (legacy)",
    tagline: "Historical Aloware sync — retired for new setup.",
    hasNativeAdapter: false,
    selectedStatus: "Aloware sync is dormant. Switch to Dialer.io or manual to keep working.",
    selectable: false,
  },
};

/**
 * Normalize any DB `crm_provider` string into a known SalesSystemId.
 * Historical `"aloware"` rows degrade to `legacy_aloware`. Anything
 * unrecognised (including the legacy `"none"` sentinel) degrades to
 * `manual` — never crashes downstream UI.
 */
export function normalizeSalesSystem(raw: string | null | undefined): SalesSystemId {
  switch ((raw ?? "").toLowerCase()) {
    case "dialer_io":
      return "dialer_io";
    case "manual":
      return "manual";
    case "gohighlevel":
      return "gohighlevel";
    case "aloware":
    case "legacy_aloware":
      return "legacy_aloware";
    default:
      return "manual";
  }
}

/**
 * Persisted DB value for a given SalesSystemId. Kept as a small
 * mapping so we can additively evolve without touching every caller.
 */
export function toCrmProviderValue(id: SalesSystemId): string {
  return id === "legacy_aloware" ? "aloware" : id;
}

export function getSalesSystem(raw: string | null | undefined): SalesSystemMeta {
  return SALES_SYSTEM_REGISTRY[normalizeSalesSystem(raw)];
}

/**
 * True when the currently selected sales system supports in-app
 * click-to-dial / SMS / power-dialer today. For everything else the UI
 * MUST hide provider-specific controls or route to the external app.
 */
export function hasInAppTelephony(id: SalesSystemId): boolean {
  // No provider currently ships a verified in-app telephony adapter.
  // Aloware code paths remain as dormant legacy and must not be invoked
  // from user-facing actions.
  return false;
  void id;
}
