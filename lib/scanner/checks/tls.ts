import tls from "node:tls";
import type { Check, RawFinding } from "../types";

type CertInfo = { validTo: Date | null; authorized: boolean; authError?: string; protocol: string | null };

function connect(host: string, port: number, opts: tls.ConnectionOptions = {}): Promise<CertInfo> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: false, timeout: 8000, ...opts }, () => {
      // Cloudflare Workers' node:tls may not expose peer certificate details: feature-detect.
      const cert = typeof socket.getPeerCertificate === "function" ? socket.getPeerCertificate() : null;
      const info: CertInfo = {
        validTo: cert?.valid_to ? new Date(cert.valid_to) : null,
        authorized: socket.authorized,
        authError: socket.authorizationError ? String(socket.authorizationError) : undefined,
        protocol: typeof socket.getProtocol === "function" ? socket.getProtocol() : null,
      };
      socket.end();
      resolve(info);
    });
    socket.on("error", reject);
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("TLS timeout"));
    });
  });
}

/** Fallback expiry source: the newest currently-valid certificate in public CT logs (crt.sh). */
export async function ctExpiry(host: string): Promise<Date | null> {
  try {
    const res = await fetch(`https://crt.sh/?q=${encodeURIComponent(host)}&exclude=expired&output=json`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { not_before: string; not_after: string; name_value: string }[];
    const now = Date.now();
    const live = rows
      .filter((r) => r.name_value.split("\n").some((n) => n === host || (n.startsWith("*.") && host.endsWith(n.slice(1)))))
      .filter((r) => Date.parse(r.not_before + "Z") <= now)
      .sort((a, b) => Date.parse(b.not_before) - Date.parse(a.not_before));
    return live[0] ? new Date(live[0].not_after + "Z") : null;
  } catch {
    return null;
  }
}

async function supportsLegacy(host: string, port: number): Promise<string | null> {
  for (const v of ["TLSv1", "TLSv1.1"] as const) {
    try {
      const r = await connect(host, port, { minVersion: v, maxVersion: v, ciphers: "DEFAULT@SECLEVEL=0" });
      if (r.protocol === v) return v;
    } catch {
      // handshake refused: good
    }
  }
  return null;
}

export const tlsCheck: Check = {
  key: "tls",
  label: "HTTPS & certificate",
  async run({ origin, hostname, fetch, home }) {
    const out: RawFinding[] = [];
    const url = new URL(origin);

    if (!home.url.startsWith("https:")) {
      out.push({ key: "tls.no-https", evidence: `${origin} is served over plain HTTP (final URL ${home.url})` });
      return out;
    }

    // Does plain http:// redirect to https://? (only meaningful on default ports)
    if (!url.port) {
      try {
        const res = await fetch(`http://${hostname}/`, { follow: false, maxBytes: 1, timeoutMs: 8000 });
        const loc = res.headers["location"] ?? "";
        if (!(res.status >= 300 && res.status < 400 && loc.startsWith("https://"))) {
          out.push({ key: "tls.http-not-redirected", evidence: `http://${hostname}/ returned HTTP ${res.status} without redirecting to https://` });
        }
      } catch {
        // port 80 closed entirely: acceptable
      }
    }

    const port = Number(url.port || 443);
    try {
      const info = await connect(hostname, port);
      const validTo = info.validTo ?? (await ctExpiry(hostname));
      const days = validTo ? Math.floor((validTo.getTime() - Date.now()) / 86_400_000) : null;
      const src = info.validTo ? "" : " (per Certificate Transparency logs)";
      if (validTo && days !== null && days < 0) {
        out.push({ key: "tls.cert-expired", evidence: `Certificate expired on ${validTo.toDateString()}${src}` });
      } else if (validTo && days !== null && days <= 21) {
        out.push({ key: "tls.cert-expiring", evidence: `Certificate expires in ${days} day(s), on ${validTo.toDateString()}${src}` });
      }
      if (!info.authorized && (days === null || days >= 0)) {
        out.push({ key: "tls.cert-invalid", evidence: `Certificate not trusted: ${info.authError ?? "unknown reason"}` });
      }
    } catch (e) {
      out.push({ key: "tls.cert-invalid", evidence: `TLS handshake failed: ${(e as Error).message}` });
    }

    const legacy = await supportsLegacy(hostname, port);
    if (legacy) out.push({ key: "tls.legacy-protocols", evidence: `Server accepted a ${legacy} handshake` });

    return out;
  },
};
