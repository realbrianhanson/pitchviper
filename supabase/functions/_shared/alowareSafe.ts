// Shared privacy + validation helpers for every Aloware edge function.
// Rules enforced here:
//  - Never log or persist raw provider payloads, transcripts, recordings,
//    phone numbers, emails, names, notes or provider bodies.
//  - Only stable event codes, resolved tenant/user IDs, counts and small
//    booleans ever land in aloware_sync_log or console.
//  - All inbound strings must be length-bounded before we look at them.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Loose E.164-ish check: 7-15 digits with an optional leading "+".
 * We are not the source of truth for phone formatting (Aloware is), but this
 * blocks obvious junk / injection strings before we hit the provider.
 */
export function isSafePhone(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 20) return false;
  return /^\+?\d{7,15}$/.test(trimmed.replace(/[\s()-]/g, ""));
}

/** Best-effort digits-only form for the provider. Rejects invalid input. */
export function normalizePhone(value: unknown): string | null {
  if (!isSafePhone(value)) return null;
  const digits = String(value).replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 ? digits : null;
}

/** Bounded text with default max — nullable so callers can conditionally set. */
export function boundedText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

/** Bounded email — no PII logging; used only to forward to Aloware. */
export function safeEmail(value: unknown): string | null {
  const t = boundedText(value, 254);
  if (!t) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? t : null;
}

export interface SafeSyncLogEntry {
  event_type: string;
  team_id?: string | null;
  processed?: boolean;
  /** Small key/value counters only. No PII, no provider bodies. */
  counters?: Record<string, number | boolean | null>;
  /** Stable, non-secret error code such as "provider_error" or "no_match". */
  error_code?: string | null;
}

/**
 * Writes an aloware_sync_log row without any PII. The `payload` column keeps
 * only stable counters/tags so we still have audit-trail visibility without
 * ever persisting phone numbers, names, transcripts or provider bodies.
 */
export async function logAlowareEvent(
  supabase: SupabaseClient,
  entry: SafeSyncLogEntry,
): Promise<void> {
  const event = boundedText(entry.event_type, 64) ?? "unknown";
  const counters: Record<string, unknown> = {};
  if (entry.counters) {
    for (const [k, v] of Object.entries(entry.counters)) {
      const key = k.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32);
      if (!key) continue;
      if (typeof v === "number" && Number.isFinite(v)) counters[key] = v;
      else if (typeof v === "boolean") counters[key] = v;
      else if (v === null) counters[key] = null;
    }
  }
  const errorCode = boundedText(entry.error_code ?? null, 64);
  try {
    await supabase.from("aloware_sync_log").insert({
      event_type: event,
      team_id: entry.team_id ?? null,
      processed: entry.processed ?? true,
      payload: counters,
      error_message: errorCode,
    });
  } catch {
    // audit failures must never break the primary request path
  }
}

/** Reads a JSON body with a hard byte cap. Returns null on any failure. */
export async function readBoundedJson(req: Request, maxBytes = 262144): Promise<unknown | null> {
  try {
    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (contentLength && contentLength > maxBytes) return null;
    const buf = new Uint8Array(await req.arrayBuffer());
    if (buf.byteLength > maxBytes) return null;
    const text = new TextDecoder().decode(buf);
    return text.length === 0 ? {} : JSON.parse(text);
  } catch {
    return null;
  }
}
