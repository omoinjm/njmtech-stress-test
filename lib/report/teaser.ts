import { severityRank, type Finding, type Severity } from "../scanner/types";

type StoredFinding = Finding & { id: string };

export type UnlockedFinding = Omit<StoredFinding, "key">;
export type LockedFinding = { id: string; severity: Severity; title: string; locked: true };

export type TeaserReport = {
  counts: Record<Severity, number>;
  score: number;
  unlocked: UnlockedFinding | null;
  locked: LockedFinding[];
};

/**
 * The free finding: the most severe one an owner can realistically fix themselves.
 * The free fix builds trust; the harder problems remain the paid work.
 * Falls back to the least severe finding so we never give away the crown jewels.
 */
export function pickUnlocked<T extends Finding>(findings: T[]): T | null {
  if (findings.length === 0) return null;
  const sorted = [...findings].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  return sorted.find((f) => f.diyFriendly) ?? sorted[sorted.length - 1];
}

const WEIGHTS: Record<Severity, number> = { critical: 30, high: 15, medium: 6, low: 2, info: 0 };

/** 0–100, higher is better. Simple, explainable, and stable. */
export function securityScore(findings: Pick<Finding, "severity">[]): number {
  const penalty = findings.reduce((s, f) => s + WEIGHTS[f.severity], 0);
  return Math.max(0, 100 - penalty);
}

export function countBySeverity(findings: Pick<Finding, "severity">[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) counts[f.severity]++;
  return counts;
}

/**
 * Server-side redaction. Locked findings carry ONLY id/severity/title, never evidence,
 * impact or fix, so nothing can be recovered from page source or the API response.
 */
export function buildTeaser(findings: StoredFinding[]): TeaserReport {
  const unlocked = pickUnlocked(findings);
  const sorted = [...findings].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  return {
    counts: countBySeverity(findings),
    score: securityScore(findings),
    unlocked: unlocked
      ? {
          id: unlocked.id,
          severity: unlocked.severity,
          title: unlocked.title,
          evidence: unlocked.evidence,
          impact: unlocked.impact,
          fix: unlocked.fix,
          diyFriendly: unlocked.diyFriendly,
        }
      : null,
    locked: sorted
      .filter((f) => f.id !== unlocked?.id)
      .map((f) => ({ id: f.id, severity: f.severity, title: f.title, locked: true as const })),
  };
}
