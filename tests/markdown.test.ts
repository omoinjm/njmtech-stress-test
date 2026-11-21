import { describe, expect, it } from "vitest";
import { reportToMarkdown } from "@/lib/report/markdown";

const base = { origin: "https://shop.example.co.za", kind: "deep" as const, scannedAt: "2026-11-21T10:00:00Z", score: 64 };

describe("reportToMarkdown", () => {
  const md = reportToMarkdown({
    ...base,
    findings: [
      { severity: "low", title: "Server version disclosed", evidence: "Server: nginx/1.18", impact: "Helps attackers.", fix: "server_tokens off;" },
      { severity: "critical", title: "Env | file exposed", evidence: "DB_PASSWORD=x\n```nested```", impact: "Takeover.", fix: "Block dotfiles." },
    ],
    loadTest: { requests: 3000, errors: 0, errorRate: 0, p50Ms: 120, p95Ms: 340, maxMs: 900, rps: 99.5, peakConcurrency: 50, durationMs: 30000, abortedEarly: false },
  });

  it("has the header, score, counts and date", () => {
    expect(md).toContain("# Security report: shop.example.co.za");
    expect(md).toContain("**Score:** 64/100");
    expect(md).toContain("**Issues:** 1 critical, 1 low");
    expect(md).toContain("Deep scan · 2026-11-21");
  });
  it("orders findings most severe first, in the table and the details", () => {
    expect(md.indexOf("### 1. Env")).toBeLessThan(md.indexOf("### 2. Server version"));
    expect(md).toContain("| 1 | 🔴 critical | Env \\| file exposed |"); // pipe escaped for the table
  });
  it("fences evidence safely even when it contains backticks", () => {
    expect(md).toContain("````\nDB_PASSWORD=x\n```nested```\n````");
  });
  it("includes stress-test results", () => {
    expect(md).toContain("**Peak concurrent users:** 50");
    expect(md).toContain("p95 340 ms");
  });
  it("handles a clean report", () => {
    const clean = reportToMarkdown({ ...base, score: 100, findings: [] });
    expect(clean).toContain("**Issues:** none found");
    expect(clean).not.toContain("## Findings");
  });
});
