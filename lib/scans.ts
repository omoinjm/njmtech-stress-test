import { and, count, eq, gt, inArray } from "drizzle-orm";
import { getDb, t, type DB } from "./db";
import { isVerified } from "./domains";

export class ScanError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const LIMITS = { scansPerUserPerDay: 5, scansPerIpPerDay: 10, loadTestsPerDomainPerDay: 1 };

const dayAgo = () => new Date(Date.now() - 86_400_000);

async function countScans(db: DB, where: ReturnType<typeof and>) {
  const [{ n }] = await db.select({ n: count() }).from(t.scans).where(where);
  return n;
}

export async function createScan(opts: {
  userId: string;
  domainId: string;
  includeLoadTest: boolean;
  acceptTerms: boolean;
  ip: string | null;
}) {
  const db = await getDb();
  if (!opts.acceptTerms) throw new ScanError(400, "You must confirm you own or are authorised to test this website.");

  const domain = await db.query.domains.findFirst({ where: eq(t.domains.id, opts.domainId) });
  if (!domain || domain.userId !== opts.userId) throw new ScanError(404, "Website not found.");
  if (!isVerified(domain)) throw new ScanError(403, "Verify ownership of this website before scanning it.");

  if ((await countScans(db, and(eq(t.scans.userId, opts.userId), gt(t.scans.createdAt, dayAgo())))) >= LIMITS.scansPerUserPerDay)
    throw new ScanError(429, `Limit reached: ${LIMITS.scansPerUserPerDay} scans per 24 hours.`);
  if (opts.ip && (await countScans(db, and(eq(t.scans.requesterIp, opts.ip), gt(t.scans.createdAt, dayAgo())))) >= LIMITS.scansPerIpPerDay)
    throw new ScanError(429, "Too many scans from your network today.");
  if ((await countScans(db, and(eq(t.scans.domainId, domain.id), inArray(t.scans.status, ["queued", "running"])))) > 0)
    throw new ScanError(409, "A scan of this website is already running.");
  if (
    opts.includeLoadTest &&
    (await countScans(db, and(eq(t.scans.domainId, domain.id), eq(t.scans.includeLoadTest, true), gt(t.scans.createdAt, dayAgo())))) >=
      LIMITS.loadTestsPerDomainPerDay
  )
    throw new ScanError(429, "Only one load test per website per 24 hours.");

  await db.update(t.users).set({ termsAcceptedAt: new Date() }).where(eq(t.users.id, opts.userId));
  const [scan] = await db
    .insert(t.scans)
    .values({ userId: opts.userId, domainId: domain.id, origin: domain.origin, includeLoadTest: opts.includeLoadTest, requesterIp: opts.ip })
    .returning();

  await startScanRun(scan.id);
  return scan;
}

/**
 * Production / `opennextjs-cloudflare preview`: a durable Cloudflare Workflow instance.
 * Plain `next dev` has no Workflow binding, so the same pipeline runs in-process (waitUntil).
 */
async function startScanRun(scanId: string) {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env, ctx } = await getCloudflareContext({ async: true });
  const db = await getDb();
  if (env.SCAN_WORKFLOW) {
    const instance = await env.SCAN_WORKFLOW.create({ id: scanId, params: { scanId } });
    await db.update(t.scans).set({ runId: instance.id }).where(eq(t.scans.id, scanId));
    return;
  }
  const { runScanInline } = await import("./scanner/pipeline");
  const p = runScanInline(db, scanId).catch((e) => console.error("inline scan failed", e));
  ctx.waitUntil(p);
  await db.update(t.scans).set({ runId: "inline-dev" }).where(eq(t.scans.id, scanId));
}
