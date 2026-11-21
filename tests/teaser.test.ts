import { describe, expect, it } from "vitest";
import { buildTeaser, pickUnlocked, securityScore } from "@/lib/report/teaser";
import { toFindings } from "@/lib/scanner";

const stored = (keys: string[]) =>
  toFindings(keys.map((key) => ({ key, evidence: `evidence for ${key}` }))).map((f, i) => ({ ...f, id: `id-${i}` }));

describe("teaser report", () => {
  it("unlocks the most severe DIY-friendly finding, not the critical one", () => {
    const fs = stored(["exposed.env", "tls.http-not-redirected", "headers.nosniff-missing", "cms.wp-xmlrpc"]);
    expect(pickUnlocked(fs)!.key).toBe("tls.http-not-redirected");
  });

  it("falls back to the least severe finding when nothing is DIY-friendly", () => {
    const fs = stored(["exposed.env", "cms.wp-xmlrpc"]);
    expect(pickUnlocked(fs)!.key).toBe("cms.wp-xmlrpc");
  });

  it("locked findings carry no evidence, impact or fix (server-side redaction)", () => {
    const fs = stored(["exposed.env", "exposed.git", "headers.hsts-missing", "cors.reflected-credentials"]);
    const t = buildTeaser(fs);
    expect(t.locked).toHaveLength(3);
    for (const l of t.locked) {
      expect(Object.keys(l).sort()).toEqual(["id", "locked", "severity", "title"]);
    }
    const json = JSON.stringify(t.locked);
    expect(json).not.toContain("evidence for");
    expect(json).not.toContain("rotate");
    expect(t.unlocked!.fix.length).toBeGreaterThan(0);
    expect(t.counts.critical).toBe(2);
  });

  it("scores 100 when clean and floors at 0", () => {
    expect(securityScore([])).toBe(100);
    expect(securityScore(Array(10).fill({ severity: "critical" }))).toBe(0);
  });
});
