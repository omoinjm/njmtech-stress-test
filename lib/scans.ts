import { and, count, eq, gt, inArray } from "drizzle-orm";
import { getDb, t, type DB } from "./db";
import { isAdminEmail } from "./env";
import { normalizeEmail } from "./auth";
import { addDomain, isVerified, normalizeOrigin } from "./domains";

export class ScanError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const LIMITS = {
  scansPerUserPerDay: 5,
  scansPerIpPerDay: 10,
  loadTestsPerDomainPerDay: 1,
  publicScansPerIpPerDay: 10,
  /** Across all requesters: stops the free scan being used as a recon tool against one site. */
  publicScansPerHostPerDay: 5,
  publicScansPerEmailPerDay: 10,
};

export const newAccessToken = () => {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

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

  const requester = await db.query.users.findFirst({ where: eq(t.users.id, opts.userId) });
  // Owner/admin: free and unmetered. Safety limits below (verification, one running scan per
  // site, one stress test per site per day) still apply because they protect the target site.
  const admin = isAdminEmail(requester?.email);
  if (!admin && (await countScans(db, and(eq(t.scans.userId, opts.userId), gt(t.scans.createdAt, dayAgo())))) >= LIMITS.scansPerUserPerDay)
    throw new ScanError(429, `Limit reached: ${LIMITS.scansPerUserPerDay} scans per 24 hours.`);
  if (!admin && opts.ip && (await countScans(db, and(eq(t.scans.requesterIp, opts.ip), gt(t.scans.createdAt, dayAgo())))) >= LIMITS.scansPerIpPerDay)
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
    .values({
      userId: opts.userId,
      domainId: domain.id,
      origin: domain.origin,
      kind: "deep",
      accessToken: newAccessToken(),
      includeLoadTest: opts.includeLoadTest,
      requesterIp: opts.ip,
    })
    .returning();

  await startScanRun(scan.id);
  return scan;
}

/**
 * Instant passive scan, no ownership verification. Only "public" checks run: the same data any
 * visitor's browser receives (homepage response, TLS handshake, public DNS). No probing, no load.
 */
export async function createPublicScan(opts: { site: string; email: string; ip: string | null; source?: string | null }) {
  const db = await getDb();
  const { hostname } = normalizeOrigin(opts.site); // throws InputError on bad input
  const email = normalizeEmail(opts.email);

  const [user] = await db
    .insert(t.users)
    .values({ email })
    .onConflictDoUpdate({ target: t.users.email, set: { email } })
    .returning();

  const publicSince = (extra: ReturnType<typeof and>) => and(eq(t.scans.kind, "public"), gt(t.scans.createdAt, dayAgo()), extra);
  const admin = isAdminEmail(email);
  if (!admin && opts.ip && (await countScans(db, publicSince(eq(t.scans.requesterIp, opts.ip)))) >= LIMITS.publicScansPerIpPerDay)
    throw new ScanError(429, "Too many free scans from your network today. Please try again tomorrow.");
  if (!admin && (await countScans(db, publicSince(eq(t.scans.userId, user.id)))) >= LIMITS.publicScansPerEmailPerDay)
    throw new ScanError(429, "Too many free scans for this email today.");
  const hostScans = await db
    .select({ n: count() })
    .from(t.scans)
    .innerJoin(t.domains, eq(t.scans.domainId, t.domains.id))
    .where(and(eq(t.scans.kind, "public"), gt(t.scans.createdAt, dayAgo()), eq(t.domains.hostname, hostname)));
  if (!admin && hostScans[0].n >= LIMITS.publicScansPerHostPerDay)
    throw new ScanError(429, `${hostname} has been scanned several times today. Please try again tomorrow.`);

  const domain = await addDomain(user.id, opts.site);
  if ((await countScans(db, and(eq(t.scans.domainId, domain.id), inArray(t.scans.status, ["queued", "running"])))) > 0)
    throw new ScanError(409, "A scan of this website is already running.");

  const [scan] = await db
    .insert(t.scans)
    .values({
      userId: user.id,
      domainId: domain.id,
      origin: domain.origin,
      kind: "public",
      accessToken: newAccessToken(),
      includeLoadTest: false,
      requesterIp: opts.ip,
      source: opts.source ?? null,
    })
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
