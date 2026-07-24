// SSRF-safe URL validator used by research/scraping paths.
// Rules:
//  - Only http/https protocols.
//  - No user/password in the URL.
//  - No localhost, loopback, private, link-local, unique-local, or metadata IPs.
//  - Hostname (not just literal IP) must not resolve to a reserved label.
// The check is purely syntactic + literal-IP based; DNS rebinding is defended
// against by capping body size and never following redirects blindly at the
// caller layer.

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "broadcasthost",
  "metadata.google.internal",
]);

function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b, c, d] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  if ([a, b, c, d].some((n) => n < 0 || n > 255)) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmark
  if (a >= 224) return true; // multicast + reserved
  if (a === 169 && b === 254 && c === 169 && d === 254) return true; // metadata
  return false;
}

function isPrivateIPv6(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "::1" || h === "::") return true;
  if (h.startsWith("fe80:")) return true; // link-local
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // unique-local
  if (h.startsWith("::ffff:")) {
    // IPv4-mapped
    const v4 = h.slice(7);
    if (isPrivateIPv4(v4)) return true;
  }
  if (h === "ff00::" || h.startsWith("ff")) return true; // multicast
  return false;
}

export interface SafeUrlResult {
  ok: boolean;
  url?: URL;
  code?: string;
}

/** Validate a user-provided URL for outbound fetches. */
export function safeExternalUrl(raw: unknown, opts: { maxLength?: number } = {}): SafeUrlResult {
  const maxLen = opts.maxLength ?? 2048;
  if (typeof raw !== "string") return { ok: false, code: "invalid_url" };
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > maxLen) return { ok: false, code: "invalid_url" };
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    // Allow bare "example.com" by prepending https://
    try {
      url = new URL(`https://${trimmed}`);
    } catch {
      return { ok: false, code: "invalid_url" };
    }
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, code: "invalid_protocol" };
  }
  if (url.username || url.password) return { ok: false, code: "credentials_forbidden" };
  const host = url.hostname.toLowerCase();
  if (!host) return { ok: false, code: "invalid_url" };
  if (BLOCKED_HOSTNAMES.has(host)) return { ok: false, code: "blocked_host" };
  if (host.endsWith(".local") || host.endsWith(".internal")) return { ok: false, code: "blocked_host" };
  if (isPrivateIPv4(host)) return { ok: false, code: "blocked_host" };
  if (isPrivateIPv6(host)) return { ok: false, code: "blocked_host" };
  return { ok: true, url };
}
