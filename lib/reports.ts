import { and, eq } from "drizzle-orm";
import { getDb, t } from "./db";
import type { LeadStatus, LoadTestSummary, ScanStatus } from "./db/schema";
import { env } from "./env";
import { buildTeaser, countBySeverity, securityScore, type TeaserReport } from "./report/teaser";
import { CHECK_KEYS } from "./scanner/check-keys";
import { severityRank, type Finding } from "./scanner/types";

export type FullFinding = Finding & { id: string };

export type ScanView = {
  id: string;
  origin: string;
  status: ScanStatus;
  progress: number;
  total: number;
  error: string | null;
  createdAt: string;
  loadTest: LoadTestSummary | null;
  /** Teaser (one finding unlocked) until the customer pays… */
  report: TeaserReport | null;
  /** …then every finding with evidence and fix. Never populated before payment. */
  full: { score: number; counts: TeaserReport["counts"]; findings: FullFinding[] } | null;
  unlocked: boolean;
  reportPriceCents: number;
  lead: { status: LeadStatus; quoteCents: number | null; quoteNote: string | null } | null;
};

export async function getScanViewForUser(scanId: string, userId: string): Promise<ScanView | null> {
  const db = await getDb();
  if (!/^[0-9a-f-]{36}$/i.test(scanId)) return null;
  const scan = await db.query.scans.findFirst({ where: and(eq(t.scans.id, scanId), eq(t.scans.userId, userId)) });
  if (!scan) return null;
  const done = scan.status === "done";
  const rows = done ? await db.select().from(t.findings).where(eq(t.findings.scanId, scan.id)) : [];
  const lead = await db.query.leads.findFirst({ where: eq(t.leads.scanId, scan.id) });
  const unlocked = !!scan.unlockedAt;
  const sorted = [...rows].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  return {
    id: scan.id,
    origin: scan.origin,
    status: scan.status,
    progress: scan.progress,
    total: CHECK_KEYS.length + (scan.includeLoadTest ? 1 : 0),
    error: scan.error,
    createdAt: scan.createdAt.toISOString(),
    loadTest: scan.loadTest ?? null,
    report: done && !unlocked ? buildTeaser(rows) : null,
    full: done && unlocked ? { score: securityScore(rows), counts: countBySeverity(rows), findings: sorted } : null,
    unlocked,
    reportPriceCents: env.reportPriceCents(),
    lead: lead ? { status: lead.status, quoteCents: lead.quoteCents, quoteNote: lead.quoteNote } : null,
  };
}
