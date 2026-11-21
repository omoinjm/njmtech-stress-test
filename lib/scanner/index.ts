import { catalogEntry } from "../findings/catalog";
import { cmsCheck, wordpressCheck } from "./checks/cms-fingerprint";
import { cookiesCheck } from "./checks/cookies";
import { corsCheck } from "./checks/cors";
import { emailDnsCheck } from "./checks/email-dns";
import { exposedFilesCheck } from "./checks/exposed-files";
import { headersCheck } from "./checks/headers";
import { infoLeakCheck } from "./checks/info-leak";
import { mixedContentCheck } from "./checks/mixed-content";
import { tlsCheck } from "./checks/tls";
import { CHECK_KEYS } from "./check-keys";
import { createFetcher } from "./net";
import { severityRank, type Check, type Finding, type HttpResult, type RawFinding } from "./types";

/** Registry: add a new check here and it runs automatically. */
export const CHECKS: Check[] = [
  tlsCheck,
  headersCheck,
  cookiesCheck,
  cmsCheck,
  emailDnsCheck,
  mixedContentCheck,
  infoLeakCheck,
  exposedFilesCheck,
  wordpressCheck,
  corsCheck,
];

export { CHECK_KEYS, checkKeysFor } from "./check-keys";
if (CHECKS.map((c) => c.key).join() !== CHECK_KEYS.join()) {
  throw new Error("CHECK_KEYS (check-keys.ts) is out of sync with the CHECKS registry");
}

export async function fetchHome(origin: string, allowPrivate: boolean): Promise<HttpResult> {
  return createFetcher({ allowPrivate })(origin + "/", { maxBytes: 300_000, timeoutMs: 15_000 });
}

export async function runCheck(
  key: string,
  args: { origin: string; hostname: string; home: HttpResult; allowPrivate: boolean },
): Promise<RawFinding[]> {
  const check = CHECKS.find((c) => c.key === key);
  if (!check) throw new Error(`Unknown check ${key}`);
  return check.run({ ...args, fetch: createFetcher({ allowPrivate: args.allowPrivate }) });
}

/** Attach catalog text, dedupe by key (merging evidence), sort most severe first. */
export function toFindings(raw: RawFinding[]): Finding[] {
  // HTTPS exists but is broken: "certificate not trusted" is the accurate finding, not "no HTTPS".
  if (raw.some((r) => r.key === "tls.cert-invalid")) raw = raw.filter((r) => r.key !== "tls.no-https");
  const byKey = new Map<string, Finding>();
  for (const r of raw) {
    const existing = byKey.get(r.key);
    if (existing) {
      existing.evidence += "\n" + r.evidence;
      continue;
    }
    const c = catalogEntry(r.key);
    byKey.set(r.key, { key: r.key, ...c, evidence: r.evidence });
  }
  return [...byKey.values()].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
}
