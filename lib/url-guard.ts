/**
 * SSRF対策: プライベート/内部ネットワークIPへのリクエストをブロック
 */

const BLOCKED_IPV4_PREFIXES = [
  "127.",       // loopback
  "10.",        // private class A
  "172.16.",    // private class B
  "172.17.",
  "172.18.",
  "172.19.",
  "172.20.",
  "172.21.",
  "172.22.",
  "172.23.",
  "172.24.",
  "172.25.",
  "172.26.",
  "172.27.",
  "172.28.",
  "172.29.",
  "172.30.",
  "172.31.",
  "192.168.",   // private class C
  "169.254.",   // link-local
  "0.",         // all-zeros
];

const BLOCKED_HOSTNAMES = ["localhost", "metadata.google.internal"];

function isPrivateIPv4(ip: string): boolean {
  return BLOCKED_IPV4_PREFIXES.some((prefix) => ip.startsWith(prefix));
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80")) return true;
  if (normalized === "::") return true;
  // IPv4-mapped IPv6 (::ffff:x.x.x.x)
  const v4Mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Mapped) return isPrivateIPv4(v4Mapped[1]);
  return false;
}

/**
 * URLのホスト名がプライベート/内部ネットワークかどうかを判定する。
 * DNS解決は行わず、ホスト名ベースの簡易チェックのみ。
 */
export function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.includes(lower)) return true;

  if (isPrivateIPv4(lower)) return true;
  if (isPrivateIPv6(lower)) return true;

  // IPv6 bracket notation
  const bracketMatch = lower.match(/^\[(.+)\]$/);
  if (bracketMatch && isPrivateIPv6(bracketMatch[1])) return true;

  return false;
}
