// Shared auth + CORS helpers for paid AI edge functions.
// Keeps every function using the same JWT validation path and the same
// generic error envelopes so we don't drift into per-endpoint bugs.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

export function errorResponse(code: string, status: number, extra?: Record<string, unknown>): Response {
  return jsonResponse({ error: code, ...(extra ?? {}) }, status);
}

export interface AuthedRequest {
  userId: string;
  serviceClient: SupabaseClient;
}

/**
 * POST-only handshake: rejects OPTIONS-passed callers with the wrong method,
 * validates a Bearer JWT against auth.users, and returns a service-role client
 * ready for privileged writes. Callers must return the Response we hand back
 * on failure without any additional body/logging.
 */
export async function authenticatePost(req: Request): Promise<
  | { ok: true; ctx: AuthedRequest }
  | { ok: false; response: Response }
> {
  if (req.method !== "POST") {
    return { ok: false, response: errorResponse("method_not_allowed", 405) };
  }

  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return { ok: false, response: errorResponse("unauthorized", 401) };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await authClient.auth.getUser();
  if (error || !data?.user) {
    return { ok: false, response: errorResponse("unauthorized", 401) };
  }

  const serviceClient = createClient(supabaseUrl, serviceKey);
  return { ok: true, ctx: { userId: data.user.id, serviceClient } };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-9a-f][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function boundedString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

/** Read JSON body with a hard byte cap. Returns null on any failure. */
export async function readBoundedJson(req: Request, maxBytes = 65536): Promise<unknown | null> {
  try {
    const cl = Number(req.headers.get("content-length") ?? "0");
    if (cl && cl > maxBytes) return null;
    const buf = new Uint8Array(await req.arrayBuffer());
    if (buf.byteLength > maxBytes) return null;
    const text = new TextDecoder().decode(buf);
    return text.length === 0 ? {} : JSON.parse(text);
  } catch {
    return null;
  }
}

/** SHA-256 timing-safe string equality (both sides hashed to hide length). */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

/**
 * Accepts either a signed-in user JWT or the service role key (timing-safe).
 * Used by scheduled / server-to-server endpoints.
 */
export async function authenticatePostOrService(req: Request): Promise<
  | { ok: true; ctx: AuthedRequest & { isService: boolean } }
  | { ok: false; response: Response }
> {
  if (req.method !== "POST") return { ok: false, response: errorResponse("method_not_allowed", 405) };
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return { ok: false, response: errorResponse("unauthorized", 401) };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const serviceClient = createClient(supabaseUrl, serviceKey);
  if (await timingSafeEqual(token, serviceKey)) {
    return { ok: true, ctx: { userId: "service", serviceClient, isService: true } };
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await authClient.auth.getUser();
  if (error || !data?.user) return { ok: false, response: errorResponse("unauthorized", 401) };
  return { ok: true, ctx: { userId: data.user.id, serviceClient, isService: false } };
}

/** Accept only whitelisted enum values. */
export function enumOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

/** ISO date string bounded to 40 chars, parseable by Date. */
export function safeIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 40) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Bounded string array (each element trimmed, max lengths enforced). */
export function boundedStringArray(value: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (!t) continue;
    out.push(t.length > maxLen ? t.slice(0, maxLen) : t);
    if (out.length >= maxItems) break;
  }
  return out;
}

