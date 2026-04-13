/**
 * SSRF対策: プライベート/内部ネットワークIPへのリクエストをブロック
 */

const BLOCKED_IPV4_RANGES = [
  // loopback
  { prefix: "127.", mask: 8 },
  // private class A
  { prefix: "10.", mask: 8 },
  // private class B
  { prefix: "172.16.", mask: 12 },
  { prefix: "172.17.", mask: 12 },
  { prefix: "172.18.", mask: 12 },
  { prefix: "172.19.", mask: 12 },
  { prefix: "172.20.", mask: 12 },
  { prefix: "172.21.", mask: 12 },
  { prefix: "172.22.", mask: 12 },
  { prefix: "172.23.", mask: 12 },
  { prefix: "172.24.", mask: 12 },
  { prefix: "172.25.", mask: 12 },
  { prefix: "172.26.", mask: 12 },
  { prefix: "172.27.", mask: 12 },
  { prefix: "172.28.", mask: 12 },
  { prefix: "172.29.", mask: 12 },
  { prefix: "172.30.", mask: 12 },
  { prefix: "172.31.", mask: 12 },
  // private class C
  { prefix: "192.168.", mask: 16 },
  // link-local
  { prefix: "169.254.", mask: 16 },
  // all-zeros / broadcast
  { prefix: "0.", mask: 8 },
];

const BLOCKED_HOSTNAMES = ["localhost", "metadata.google.internal"];

function isPrivateIPv4(ip: string): boolean {
  return BLOCKED_IPV4_RANGES.some((range) => ip.startsWith(range.prefix));
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
