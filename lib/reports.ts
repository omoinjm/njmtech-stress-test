import { eq } from "drizzle-orm";
import { getDb, t } from "./db";
import type { LeadStatus, LoadTestSummary, ScanKind, ScanStatus } from "./db/schema";
import { isVerified } from "./domains";
import { fixGuideFor } from "./blog";
import { env, isAdminEmail } from "./env";
import { buildTeaser, countBySeverity, securityScore, type TeaserReport } from "./report/teaser";
import { checkKeysFor } from "./scanner/check-keys";
import { severityRank, type Finding } from "./scanner/types";

export type FullFinding = Finding & { id: string };

export type ScanView = {
  id: string;
  origin: string;
  kind: ScanKind;
  status: ScanStatus;
  /** For the polling URL: lets the requester view the scan before signing in. */
  accessToken: string | null;
  /** Signed in as the scan's owner: needed to pay, request a quote, or start a deep scan. */
  viewerIsOwner: boolean;
  ownerEmailHint: string;
  domainId: string;
  domainVerified: boolean;
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
  /** Scan belongs to an owner/admin account: everything is free (no paywall, no quote). */
  ownerIsAdmin: boolean;
  reportPriceCents: number;
  lead: { status: LeadStatus; quoteCents: number | null; quoteNote: string | null } | null;
  /** finding id → published fix guide. Only for findings the viewer can already see in full. */
  fixGuides: Record<string, { slug: string; title: string }>;
};

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const maskEmail = (e: string) => {
  const [l, d] = e.split("@");
  return `${l.slice(0, 1)}${"*".repeat(Math.max(1, Math.min(6, l.length - 1)))}@${d}`;
};

/** Owner (signed in) or anyone holding the scan's access link may view it. */
export async function getScanView(scanId: string, viewer: { userId?: string | null; token?: string | null }): Promise<ScanView | null> {
  const db = await getDb();
  if (!/^[0-9a-f-]{36}$/i.test(scanId)) return null;
  const scan = await db.query.scans.findFirst({ where: eq(t.scans.id, scanId) });
  if (!scan) return null;
  const viewerIsOwner = !!viewer.userId && viewer.userId === scan.userId;
  const tokenOk = !!viewer.token && !!scan.accessToken && safeEqual(viewer.token, scan.accessToken);
  if (!viewerIsOwner && !tokenOk) return null;
  const owner = await db.query.users.findFirst({ where: eq(t.users.id, scan.userId) });
  const domain = await db.query.domains.findFirst({ where: eq(t.domains.id, scan.domainId) });
  const done = scan.status === "done";
  const rows = done ? await db.select().from(t.findings).where(eq(t.findings.scanId, scan.id)) : [];
  const lead = await db.query.leads.findFirst({ where: eq(t.leads.scanId, scan.id) });
  const ownerIsAdmin = isAdminEmail(owner?.email);
  const unlocked = !!scan.unlockedAt || ownerIsAdmin;
  const sorted = [...rows].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  const teaser = done && !unlocked ? buildTeaser(rows) : null;
  const visible = done ? (unlocked ? rows : rows.filter((r) => r.id === teaser?.unlocked?.id)) : [];
  const fixGuides: ScanView["fixGuides"] = {};
  for (const r of visible) {
    const g = fixGuideFor(r.key);
    if (g) fixGuides[r.id] = g;
  }
  return {
    id: scan.id,
    origin: scan.origin,
    kind: scan.kind,
    status: scan.status,
    accessToken: tokenOk || viewerIsOwner ? scan.accessToken : null,
    viewerIsOwner,
    ownerEmailHint: owner ? maskEmail(owner.email) : "",
    domainId: scan.domainId,
    domainVerified: domain ? isVerified(domain) : false,
    progress: scan.progress,
    total: checkKeysFor(scan.kind).length + (scan.includeLoadTest ? 1 : 0),
    error: scan.error,
    createdAt: scan.createdAt.toISOString(),
    loadTest: scan.loadTest ?? null,
    report: teaser,
    full: done && unlocked ? { score: securityScore(rows), counts: countBySeverity(rows), findings: sorted } : null,
    unlocked,
    ownerIsAdmin,
    reportPriceCents: env.reportPriceCents(),
    lead: lead ? { status: lead.status, quoteCents: lead.quoteCents, quoteNote: lead.quoteNote } : null,
    fixGuides,
  };
}
