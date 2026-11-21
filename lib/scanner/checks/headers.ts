import type { Check, RawFinding } from "../types";

export const headersCheck: Check = {
  key: "headers",
  label: "Security headers",
  async run({ home }) {
    const h = home.headers;
    const out: RawFinding[] = [];
    const isHttps = home.url.startsWith("https:");
    const csp = h["content-security-policy"] ?? "";

    if (isHttps && !h["strict-transport-security"]) {
      out.push({ key: "headers.hsts-missing", evidence: `No Strict-Transport-Security header on ${home.url}` });
    }
    if (!csp) {
      out.push({ key: "headers.csp-missing", evidence: `No Content-Security-Policy header on ${home.url}` });
    }
    if (!h["x-frame-options"] && !/frame-ancestors/i.test(csp)) {
      out.push({ key: "headers.clickjacking", evidence: "Neither X-Frame-Options nor CSP frame-ancestors is set" });
    }
    if ((h["x-content-type-options"] ?? "").toLowerCase() !== "nosniff") {
      out.push({ key: "headers.nosniff-missing", evidence: "X-Content-Type-Options: nosniff not set" });
    }
    if (!h["referrer-policy"]) {
      out.push({ key: "headers.referrer-policy-missing", evidence: "No Referrer-Policy header" });
    }
    if (!h["permissions-policy"]) {
      out.push({ key: "headers.permissions-policy-missing", evidence: "No Permissions-Policy header" });
    }
    return out;
  },
};
