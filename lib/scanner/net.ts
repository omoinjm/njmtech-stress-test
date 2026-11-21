import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { FetchOpts, HttpResult } from "./types";

export const USER_AGENT = "NJMTech-SecurityScan/1.0 (+authorised scan; owner-verified)";

export class BlockedTargetError extends Error {}

function ipv4ToInt(ip: string) {
  return ip.split(".").reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
}
function inCidr(ip: string, cidr: string) {
  const [base, bits] = cidr.split("/");
  const mask = Number(bits) === 0 ? 0 : (~0 << (32 - Number(bits))) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}
const PRIVATE_V4 = [
  "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16",
  "172.16.0.0/12", "192.0.0.0/24", "192.168.0.0/16", "198.18.0.0/15", "224.0.0.0/4", "240.0.0.0/4",
];

export function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) return PRIVATE_V4.some((c) => inCidr(ip, c));
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateIp(v6.slice(7));
  return (
    v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") ||
    v6.startsWith("fe80") || v6.startsWith("ff")
  );
}

/**
 * SSRF guard: refuse targets that resolve to internal/private addresses (cloud metadata,
 * localhost, LAN). Verified ownership of a domain does not make its DNS trustworthy.
 */
export async function assertPublicHost(hostname: string, allowPrivate: boolean) {
  if (allowPrivate) return;
  const host = hostname.replace(/^\[|\]$/g, "");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addrs.length === 0) throw new BlockedTargetError(`${hostname} does not resolve`);
  for (const a of addrs) {
    if (isPrivateIp(a.address)) {
      throw new BlockedTargetError(`${hostname} resolves to a private address (${a.address})`);
    }
  }
}

async function readCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  const buf = Buffer.concat(chunks).subarray(0, maxBytes);
  return buf.toString("utf8");
}

/** Build a Fetcher bound to one scan: SSRF-checked, time/size-capped, manual redirects. */
export function createFetcher(opts: { allowPrivate: boolean }) {
  return async function safeFetch(url: string, o: FetchOpts = {}): Promise<HttpResult> {
    const follow = o.follow ?? true;
    let current = new URL(url);
    for (let hop = 0; hop <= 5; hop++) {
      if (!["http:", "https:"].includes(current.protocol)) {
        throw new BlockedTargetError(`Unsupported protocol ${current.protocol}`);
      }
      await assertPublicHost(current.hostname, opts.allowPrivate);
      const res = await fetch(current, {
        method: o.method ?? "GET",
        headers: { "user-agent": USER_AGENT, ...o.headers },
        redirect: "manual",
        signal: AbortSignal.timeout(o.timeoutMs ?? 10_000),
        cache: "no-store",
      });
      const loc = res.headers.get("location");
      if (follow && loc && res.status >= 300 && res.status < 400) {
        await res.body?.cancel().catch(() => {});
        current = new URL(loc, current);
        continue;
      }
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => (headers[k] = v));
      return {
        url: current.toString(),
        status: res.status,
        headers,
        setCookies: res.headers.getSetCookie(),
        body: o.method === "HEAD" ? "" : await readCapped(res, o.maxBytes ?? 512_000),
      };
    }
    throw new Error("Too many redirects");
  };
}
