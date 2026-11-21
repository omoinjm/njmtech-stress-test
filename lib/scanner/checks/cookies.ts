import type { Check } from "../types";

export function auditCookie(raw: string, isHttps: boolean): string[] {
  const parts = raw.split(";").map((p) => p.trim().toLowerCase());
  const problems: string[] = [];
  if (isHttps && !parts.includes("secure")) problems.push("Secure");
  if (!parts.includes("httponly")) problems.push("HttpOnly");
  if (!parts.some((p) => p.startsWith("samesite="))) problems.push("SameSite");
  return problems;
}

export const cookiesCheck: Check = {
  key: "cookies",
  label: "Cookie security",
  async run({ home }) {
    const isHttps = home.url.startsWith("https:");
    const bad = home.setCookies
      .map((c) => ({ name: c.split("=")[0].trim(), missing: auditCookie(c, isHttps) }))
      .filter((c) => c.missing.length > 0);
    if (bad.length === 0) return [];
    return [
      {
        key: "cookies.insecure-flags",
        evidence: bad.map((c) => `${c.name}: missing ${c.missing.join(", ")}`).join("\n"),
      },
    ];
  },
};
