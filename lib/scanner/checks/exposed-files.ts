import type { Check, RawFinding } from "../types";

type Probe = { path: string; key: string; match: (body: string, ct: string) => boolean };

/** Every probe requires a content signature, so "soft 404" pages that return 200 don't create false positives. */
const PROBES: Probe[] = [
  { path: "/.env", key: "exposed.env", match: (b) => /^\s*[A-Z][A-Z0-9_]{2,}\s*=/m.test(b) && !/<html/i.test(b) },
  { path: "/.git/HEAD", key: "exposed.git", match: (b) => /^ref: refs\//.test(b.trim()) },
  { path: "/.git/config", key: "exposed.git", match: (b) => /\[core\]/.test(b) },
  { path: "/backup.sql", key: "exposed.backup", match: (b) => /(CREATE TABLE|INSERT INTO|-- MySQL dump)/i.test(b) },
  { path: "/db.sql", key: "exposed.backup", match: (b) => /(CREATE TABLE|INSERT INTO|-- MySQL dump)/i.test(b) },
  { path: "/dump.sql", key: "exposed.backup", match: (b) => /(CREATE TABLE|INSERT INTO|-- MySQL dump)/i.test(b) },
  { path: "/wp-config.php.bak", key: "exposed.backup", match: (b) => /DB_PASSWORD/.test(b) },
  { path: "/backup.zip", key: "exposed.backup", match: (b, ct) => b.startsWith("PK") || /zip/.test(ct) },
  { path: "/phpinfo.php", key: "exposed.phpinfo", match: (b) => /phpinfo\(\)|PHP Version/i.test(b) && /<table/i.test(b) },
  { path: "/info.php", key: "exposed.phpinfo", match: (b) => /phpinfo\(\)|PHP Version/i.test(b) && /<table/i.test(b) },
  { path: "/server-status", key: "exposed.server-status", match: (b) => /Apache Server Status/i.test(b) },
];

const LISTING_RE = /<title>\s*Index of \//i;

export const exposedFilesCheck: Check = {
  key: "exposed-files",
  label: "Exposed sensitive files",
  async run({ origin, fetch, home }) {
    const out: RawFinding[] = [];
    const seen = new Set<string>();
    // Sequential + small body cap: polite to the target.
    for (const p of PROBES) {
      if (seen.has(p.key)) continue;
      try {
        const res = await fetch(origin + p.path, { follow: false, maxBytes: 16_384, timeoutMs: 8000 });
        if (res.status === 200 && p.match(res.body, res.headers["content-type"] ?? "")) {
          seen.add(p.key);
          out.push({ key: p.key, evidence: `${origin}${p.path} returned HTTP 200 with matching content` });
        }
      } catch {
        // network error on one probe: ignore, keep going
      }
    }
    if (LISTING_RE.test(home.body)) {
      out.push({ key: "exposed.directory-listing", evidence: `${home.url} shows an auto-generated "Index of /" page` });
    } else {
      for (const dir of ["/uploads/", "/wp-content/uploads/", "/backup/"]) {
        try {
          const res = await fetch(origin + dir, { follow: false, maxBytes: 8192, timeoutMs: 8000 });
          if (res.status === 200 && LISTING_RE.test(res.body)) {
            out.push({ key: "exposed.directory-listing", evidence: `${origin}${dir} shows a directory listing` });
            break;
          }
        } catch {}
      }
    }
    return out;
  },
};
