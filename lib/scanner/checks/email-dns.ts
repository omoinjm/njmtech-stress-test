import { resolveTxt } from "node:dns/promises";
import type { Check, RawFinding } from "../types";

export type TxtResolver = (name: string) => Promise<string[]>;

const defaultResolver: TxtResolver = async (name) => {
  try {
    return (await resolveTxt(name)).map((r) => r.join(""));
  } catch {
    return [];
  }
};

/** Registrable-ish apex: strips a leading "www." only (keeps it simple and predictable). */
export const mailDomain = (hostname: string) => hostname.replace(/^www\./i, "");

export function makeEmailDnsCheck(resolve: TxtResolver = defaultResolver): Check {
  return {
    key: "email-dns",
    label: "Email spoofing protection (SPF/DMARC)",
    async run({ hostname }) {
      if (/^(localhost|\d+\.\d+\.\d+\.\d+)$/i.test(hostname)) return [];
      const domain = mailDomain(hostname);
      const out: RawFinding[] = [];
      const spf = (await resolve(domain)).find((r) => /^v=spf1/i.test(r));
      if (!spf) out.push({ key: "email.spf-missing", evidence: `No "v=spf1" TXT record on ${domain}` });
      const dmarc = (await resolve(`_dmarc.${domain}`)).find((r) => /^v=DMARC1/i.test(r));
      if (!dmarc) out.push({ key: "email.dmarc-missing", evidence: `No DMARC TXT record at _dmarc.${domain}` });
      else if (/;\s*p=none/i.test(dmarc)) out.push({ key: "email.dmarc-none", evidence: `_dmarc.${domain}: ${dmarc}` });
      return out;
    },
  };
}

export const emailDnsCheck = makeEmailDnsCheck();
