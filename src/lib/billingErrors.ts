// Parse Supabase FunctionsHttpError.context (which may be a Response) into a
// short generic error code, never exposing internal details.

const KNOWN_CODES = new Set([
  "billing_not_configured",
  "use_billing_portal",
  "no_customer",
  "no_team",
  "forbidden",
  "unauthorized",
  "invalid_plan",
  "invalid_interval",
  "invalid_body",
  "rate_limited",
  "method_not_allowed",
  "checkout_failed",
  "invalid_url",
  "internal_error",
]);

function sanitize(code: unknown): string {
  if (typeof code !== "string") return "internal_error";
  const trimmed = code.trim().slice(0, 64);
  return KNOWN_CODES.has(trimmed) ? trimmed : "internal_error";
}

/** Extract a safe error code from a Supabase functions.invoke error. */
export async function parseFunctionErrorCode(err: unknown): Promise<string> {
  if (!err) return "internal_error";
  const ctx = (err as { context?: unknown }).context;
  // Response body path (FunctionsHttpError)
  if (ctx && typeof (ctx as Response).json === "function") {
    try {
      const cloned = typeof (ctx as Response).clone === "function"
        ? (ctx as Response).clone()
        : (ctx as Response);
      const body = await cloned.json();
      return sanitize((body as { error?: unknown })?.error);
    } catch {
      return "internal_error";
    }
  }
  // Plain-object fallback (older shape)
  if (ctx && typeof ctx === "object") {
    return sanitize((ctx as { error?: unknown }).error);
  }
  return "internal_error";
}
