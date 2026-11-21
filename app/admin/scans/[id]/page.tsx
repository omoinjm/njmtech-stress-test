import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CopyMarkdownButton } from "@/components/copy-markdown-button";
import { PrintButton } from "@/components/print-button";
import { reportToMarkdown } from "@/lib/report/markdown";
import { Card, ScoreRing, SeverityBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getDb, t } from "@/lib/db";
import { securityScore } from "@/lib/report/teaser";
import { severityRank } from "@/lib/scanner/types";

async function Inner({ params }: { params: PageProps<"/admin/scans/[id]">["params"] }) {
  const db = await getDb();
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const scan = await db.query.scans.findFirst({ where: eq(t.scans.id, id) });
  if (!scan) notFound();
  const user = await db.query.users.findFirst({ where: eq(t.users.id, scan.userId) });
  const findings = (await db.select().from(t.findings).where(eq(t.findings.scanId, id))).sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity),
  );
  const lt = scan.loadTest;

  return (
    <div className="grid gap-5">
      <Card className="flex flex-col items-center gap-6 sm:flex-row">
        <ScoreRing score={securityScore(findings)} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Full security report: {new URL(scan.origin).host}</h1>
          <p className="text-sm text-slate-500">
            Customer: {user?.email} · Scanned {scan.createdAt.toLocaleString("en-ZA")} · Status: {scan.status}
          </p>
          {scan.error && <p className="text-sm text-red-600">{scan.error}</p>}
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <CopyMarkdownButton
            markdown={reportToMarkdown({
              origin: scan.origin,
              kind: scan.kind,
              scannedAt: scan.createdAt,
              score: securityScore(findings),
              findings,
              loadTest: lt,
            })}
          />
          <PrintButton />
        </div>
      </Card>
      {lt && (
        <Card>
          <h2 className="font-semibold">Stress test</h2>
          <p className="mt-1 font-mono text-xs">
            {lt.requests} req · peak {lt.peakConcurrency} VUs · {lt.rps} rps · errors {(lt.errorRate * 100).toFixed(1)}% · p50{" "}
            {lt.p50Ms}ms · p95 {lt.p95Ms}ms · max {lt.maxMs}ms · {Math.round(lt.durationMs / 1000)}s
            {lt.abortedEarly && " · ABORTED (error threshold)"}
          </p>
        </Card>
      )}
      {findings.map((f, i) => (
        <Card key={f.id} className="break-inside-avoid">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">#{i + 1}</span>
            <SeverityBadge severity={f.severity} />
            {f.diyFriendly && <span className="text-xs text-emerald-600">DIY-friendly</span>}
            <code className="ml-auto text-xs text-slate-400">{f.key}</code>
          </div>
          <h2 className="mt-2 font-semibold">{f.title}</h2>
          <p className="mt-1 text-sm">{f.impact}</p>
          <h3 className="mt-3 text-xs font-semibold uppercase text-slate-500">Evidence</h3>
          <pre className="whitespace-pre-wrap rounded bg-black/5 p-2 font-mono text-xs dark:bg-white/10">{f.evidence}</pre>
          <h3 className="mt-3 text-xs font-semibold uppercase text-slate-500">Fix</h3>
          <pre className="whitespace-pre-wrap rounded bg-black/5 p-2 font-mono text-xs dark:bg-white/10">{f.fix}</pre>
        </Card>
      ))}
      {findings.length === 0 && <Card>No findings.</Card>}
    </div>
  );
}

export default function AdminScanPage(props: PageProps<"/admin/scans/[id]">) {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
      <Inner params={props.params} />
    </Suspense>
  );
}
