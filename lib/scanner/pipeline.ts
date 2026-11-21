// Scan pipeline as plain functions over a DB handle. The Cloudflare Workflow wraps each one in
// a durable step; local `next dev` runs them in-process via runScanInline().
import { eq, sql } from "drizzle-orm";
import { t, type DB } from "../db";
import type { LoadTestSummary, ScanKind } from "../db/schema";
import { sendEmail } from "../email";
import { env } from "../env";
import { countBySeverity } from "../report/teaser";
import { checkKeysFor } from "./check-keys";
import { loadFindings, runLoadTest, summarize, type RawLoad } from "./checks/load-test";
import { fetchHome, runCheck, toFindings } from "./index";
import { assertPublicHost } from "./net";
import type { HttpResult, RawFinding } from "./types";

export type Target = {
  origin: string;
  hostname: string;
  kind: ScanKind;
  includeLoadTest: boolean;
  allowPrivate: boolean;
  email: string;
  accessToken: string | null;
};
export type CheckArgs = { origin: string; hostname: string; home: HttpResult; allowPrivate: boolean };

export async function markRunning(db: DB, scanId: string): Promise<Target> {
  const [scan] = await db.update(t.scans).set({ status: "running" }).where(eq(t.scans.id, scanId)).returning();
  const user = await db.query.users.findFirst({ where: eq(t.users.id, scan.userId) });
  return {
    origin: scan.origin,
    hostname: new URL(scan.origin).hostname,
    kind: scan.kind,
    // Defense in depth: a public scan can never include the load test.
    includeLoadTest: scan.kind === "deep" && scan.includeLoadTest,
    accessToken: scan.accessToken,
    allowPrivate: env.allowPrivateTargets(),
    email: user!.email,
  };
}

/**
 * Fetch the homepage. If HTTPS fails but plain HTTP works (typically a broken certificate, which
 * the Workers runtime refuses outright), scan over HTTP and report the certificate problem.
 */
export async function fetchHomeSafe(
  origin: string,
  allowPrivate: boolean,
): Promise<{ home?: HttpResult; error?: string; extra?: RawFinding[] }> {
  try {
    return { home: await fetchHome(origin, allowPrivate) };
  } catch (e) {
    const error = (e as Error).message;
    const u = new URL(origin);
    if (u.protocol === "https:" && !u.port) {
      try {
        const home = await fetchHome(`http://${u.host}`, allowPrivate);
        return {
          home,
          extra: [{ key: "tls.cert-invalid", evidence: `HTTPS connection to ${u.host} failed (${error}); the site only loaded over plain HTTP.` }],
        };
      } catch {}
    }
    return { error };
  }
}

export async function bumpProgress(db: DB, scanId: string) {
  await db.update(t.scans).set({ progress: sql`${t.scans.progress} + 1` }).where(eq(t.scans.id, scanId));
}

/** Never throws: one flaky check must not sink the whole scan. */
export async function runCheckSafe(db: DB, scanId: string, key: string, args: CheckArgs): Promise<RawFinding[]> {
  try {
    return await runCheck(key, args);
  } catch (e) {
    console.error(`[scan ${scanId}] check ${key} failed:`, e);
    return [];
  } finally {
    await bumpProgress(db, scanId);
  }
}

export async function saveShard(db: DB, scanId: string, shard: number, r: RawLoad) {
  await db
    .insert(t.loadShards)
    .values({ scanId, shard, latencies: r.latencies, errors: r.errors, peak: r.peak, durationMs: r.durationMs, aborted: r.aborted })
    .onConflictDoNothing();
}

export async function collectShards(db: DB, scanId: string, expected: number, requireAll: boolean) {
  const rows = await db.select().from(t.loadShards).where(eq(t.loadShards.scanId, scanId));
  if (requireAll && rows.length < expected) throw new Error(`load shards ${rows.length}/${expected} reported`);
  if (rows.length === 0) return null;
  return summarize(rows.map((r) => ({ latencies: r.latencies, errors: r.errors, peak: r.peak, durationMs: r.durationMs, aborted: r.aborted })));
}

export async function saveResults(db: DB, scanId: string, raw: RawFinding[], load: LoadTestSummary | null) {
  const findings = toFindings(raw);
  // D1 has no interactive transactions: batch() runs these atomically.
  await db.batch([
    db.delete(t.findings).where(eq(t.findings.scanId, scanId)),
    ...findings.map((f) => db.insert(t.findings).values({ ...f, scanId })),
    db.update(t.scans).set({ status: "done", loadTest: load, finishedAt: new Date() }).where(eq(t.scans.id, scanId)),
  ]);
}

export async function failScan(db: DB, scanId: string, message: string) {
  await db.update(t.scans).set({ status: "failed", error: message, finishedAt: new Date() }).where(eq(t.scans.id, scanId));
}

export async function notify(db: DB, scanId: string, target: Target) {
  const rows = await db.select({ severity: t.findings.severity }).from(t.findings).where(eq(t.findings.scanId, scanId));
  const c = countBySeverity(rows);
  const summary = `${c.critical} critical, ${c.high} high, ${c.medium} medium, ${c.low} low`;
  await sendEmail({
    to: target.email,
    subject: `Your security scan of ${target.hostname} is ready`,
    text: `We found ${rows.length} issue(s) on ${target.origin} (${summary}).\n\nView your report and a free fix: ${env.appUrl()}/scans/${scanId}${target.accessToken ? `?t=${target.accessToken}` : ""}\n\nNJM Tech Security`,
  });
  for (const admin of env.adminEmails()) {
    await sendEmail({
      to: admin,
      subject: `[${target.kind === "deep" ? "Deep scan" : "Public scan"}] ${target.hostname}: ${summary}`,
      text: `Customer: ${target.email}\nSite: ${target.origin}\nFull report: ${env.appUrl()}/admin/scans/${scanId}`,
    });
  }
}

/** Local-dev runner (no Workflow binding): same pipeline, single-process load test. */
export async function runScanInline(db: DB, scanId: string) {
  const target = await markRunning(db, scanId);
  const { home, error, extra } = await fetchHomeSafe(target.origin, target.allowPrivate);
  if (!home) return failScan(db, scanId, `Could not reach ${target.origin}: ${error}`);
  const args = { origin: target.origin, hostname: target.hostname, home, allowPrivate: target.allowPrivate };
  const raw = (await Promise.all(checkKeysFor(target.kind).map((k) => runCheckSafe(db, scanId, k, args)))).flat();
  raw.push(...(extra ?? []));
  let load: LoadTestSummary | null = null;
  if (target.includeLoadTest) {
    try {
      await assertPublicHost(target.hostname, target.allowPrivate);
      load = await runLoadTest(target.origin + "/");
      raw.push(...loadFindings(load));
    } catch (e) {
      console.error(`[scan ${scanId}] load test failed`, e);
    } finally {
      await bumpProgress(db, scanId);
    }
  }
  await saveResults(db, scanId, raw, load);
  await notify(db, scanId, target);
}

