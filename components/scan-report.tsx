"use client";

import { useActionState, useEffect, useState } from "react";
import { submitLeadAction } from "@/app/actions";
import type { FullFinding, ScanView } from "@/lib/reports";
import type { Severity } from "@/lib/scanner/types";
import Link from "next/link";
import { reportToMarkdown } from "@/lib/report/markdown";
import { CopyMarkdownButton } from "./copy-markdown-button";
import { ScanSignIn } from "./forms";
import { btnCls, btnGhostCls, Card, inputCls, ScoreRing, SeverityBadge } from "./ui";

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low", "info"];

/** Placeholder copy rendered under the blur. The real text never reaches the browser. */
const LOREM =
  "To resolve this issue, update the server configuration so that the affected component rejects untrusted input and enforces the correct policy. Apply the change to every environment, then redeploy and confirm the response headers.";

export function ScanReport({ initial, paymentNotice }: { initial: ScanView; paymentNotice?: string }) {
  const [view, setView] = useState(initial);
  const running = view.status === "queued" || view.status === "running";

  useEffect(() => {
    if (!running) return;
    const id = setInterval(async () => {
      const res = await fetch(`/api/scans/${view.id}${view.accessToken ? `?t=${view.accessToken}` : ""}`, { cache: "no-store" });
      if (res.ok) setView(await res.json());
    }, 2500);
    return () => clearInterval(id);
  }, [running, view.id, view.accessToken]);

  const host = new URL(view.origin).host;

  if (running) {
    const pct = Math.round((view.progress / Math.max(1, view.total)) * 100);
    return (
      <Card className="mx-auto max-w-xl text-center">
        <h1 className="text-xl font-semibold">{view.kind === "deep" ? "Deep scanning" : "Scanning"} {host}…</h1>
        <p className="mt-1 text-sm text-slate-500">
          {view.kind === "deep" ? "This usually takes 1–2 minutes." : "This usually takes under a minute."} You can leave this page;
          we&apos;ll email you the link when it&apos;s ready.
        </p>
        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div className="h-full bg-emerald-600 transition-all" style={{ width: `${Math.max(5, pct)}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">{view.progress} of {view.total} checks complete</p>
      </Card>
    );
  }

  if (view.status === "failed" || (!view.report && !view.full)) {
    return (
      <Card className="mx-auto max-w-xl">
        <h1 className="text-xl font-semibold">Scan could not complete</h1>
        <p className="mt-2 text-sm text-slate-500">{view.error ?? "Unknown error."}</p>
      </Card>
    );
  }

  const summary = view.full ?? view.report!;
  const total = view.full ? view.full.findings.length : view.report!.locked.length + (view.report!.unlocked ? 1 : 0);

  return (
    <div className="grid gap-6">
      {paymentNotice && <PaymentNotice status={paymentNotice} />}
      <Card className="flex flex-col items-center gap-6 sm:flex-row">
        <ScoreRing score={summary.score} />
        <div className="flex-1">
          <div className="mb-1">
            <span className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase ${view.kind === "deep" ? "bg-violet-600 text-white" : "bg-slate-500/20 text-slate-600 dark:text-slate-300"}`}>
              {view.kind === "deep" ? "Deep scan" : "Public scan"}
            </span>
          </div>
          <h1 className="text-2xl font-bold">{view.unlocked ? "Full security report" : "Security report"} for {host}</h1>
          <p className="text-sm text-slate-500">
            {total === 0 ? "No issues found. Nice work!" : `We found ${total} issue${total === 1 ? "" : "s"} on your site.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SEVERITIES.filter((s) => summary.counts[s] > 0).map((s) => (
              <span key={s} className="flex items-center gap-1 text-sm">
                <SeverityBadge severity={s} /> × {summary.counts[s]}
              </span>
            ))}
          </div>
        </div>
        {view.full && (
          <div className="no-print flex flex-wrap gap-2">
            <CopyMarkdownButton
              markdown={reportToMarkdown({
                origin: view.origin,
                kind: view.kind,
                scannedAt: view.createdAt,
                score: view.full.score,
                findings: view.full.findings,
                loadTest: view.loadTest,
              })}
            />
            <button onClick={() => window.print()} className={btnGhostCls}>
              Export PDF
            </button>
          </div>
        )}
      </Card>

      {view.loadTest && <LoadCard lt={view.loadTest} />}

      {view.full ? (
        view.full.findings.map((f, i) => <FindingCard key={f.id} f={f} index={i + 1} />)
      ) : (
        <TeaserBody view={view} />
      )}

      {(total > 0 || view.kind === "public") && <NextStep view={view} />}
    </div>
  );
}

function PaymentNotice({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    paid: ["✅ Payment received. Thank you! A receipt is on its way to your inbox.", "border-emerald-600 text-emerald-700 dark:text-emerald-400"],
    processing: ["⏳ Your payment is still processing. This page will update once Yoco confirms it.", "border-amber-500 text-amber-700"],
    cancelled: ["Payment cancelled. You have not been charged.", "border-slate-400 text-slate-600"],
    failed: ["❌ The payment did not go through. You have not been charged. Please try again.", "border-red-600 text-red-700"],
  };
  const [msg, cls] = map[status] ?? map.failed;
  return <div className={`no-print rounded-lg border-2 px-4 py-3 text-sm font-medium ${cls}`}>{msg}</div>;
}

function LoadCard({ lt }: { lt: NonNullable<ScanView["loadTest"]> }) {
  return (
    <Card>
      <h2 className="mb-3 font-semibold">⚡ Stress test</h2>
      <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
        {[
          ["Peak users", lt.peakConcurrency],
          ["Requests", lt.requests],
          ["Error rate", `${(lt.errorRate * 100).toFixed(1)}%`],
          ["Slowest 5%", `${(lt.p95Ms / 1000).toFixed(2)}s`],
        ].map(([k, v]) => (
          <div key={k}>
            <div className="text-2xl font-bold">{v}</div>
            <div className="text-xs text-slate-500">{k}</div>
          </div>
        ))}
      </div>
      {lt.abortedEarly && <p className="mt-3 text-sm text-red-600">We stopped the test early because your site started failing.</p>}
    </Card>
  );
}

function FindingCard({ f, index, free }: { f: Omit<FullFinding, "key"> & { key?: string }; index?: number; free?: boolean }) {
  return (
    <Card className={`break-inside-avoid ${free ? "border-emerald-600/40" : ""}`}>
      <div className="mb-2 flex items-center gap-2">
        {index && <span className="text-sm text-slate-500">#{index}</span>}
        {free && <span className="rounded bg-emerald-600 px-2 py-0.5 text-[11px] font-bold uppercase text-white">Free fix</span>}
        <SeverityBadge severity={f.severity} />
      </div>
      <h2 className="text-lg font-semibold">{f.title}</h2>
      <h3 className="mt-3 text-sm font-semibold">Why it matters</h3>
      <p className="text-sm text-slate-600 dark:text-slate-300">{f.impact}</p>
      <h3 className="mt-3 text-sm font-semibold">What we saw</h3>
      <pre className="mt-1 whitespace-pre-wrap rounded bg-black/5 p-3 font-mono text-xs dark:bg-white/10">{f.evidence}</pre>
      <h3 className="mt-3 text-sm font-semibold">How to fix it</h3>
      <pre className="mt-1 whitespace-pre-wrap rounded bg-black/5 p-3 font-mono text-xs dark:bg-white/10">{f.fix}</pre>
    </Card>
  );
}

function TeaserBody({ view }: { view: ScanView }) {
  const r = view.report!;
  return (
    <>
      {r.unlocked && <FindingCard f={r.unlocked} free />}
      {r.locked.length > 0 && (
        <div className="grid gap-3">
          <h2 className="font-semibold">Other issues ({r.locked.length})</h2>
          {r.locked.map((f) => (
            <Card key={f.id} className="relative overflow-hidden opacity-80">
              <div className="flex items-center gap-2">
                <SeverityBadge severity={f.severity} />
                <span className="font-medium text-slate-500">{f.title}</span>
              </div>
              <p aria-hidden className="mt-2 select-none text-sm text-slate-400 blur-[5px]">{LOREM}</p>
              <div className="absolute inset-0 grid place-items-center bg-gradient-to-t from-[var(--background)]/80 to-transparent">
                <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">🔒 In full report</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

const zar = (c: number) => `R${(c / 100).toLocaleString("en-ZA", { minimumFractionDigits: c % 100 ? 2 : 0 })}`;

function PayButton({ scanId, kind, label }: { scanId: string; kind: "report_unlock" | "fix"; label: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function pay() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scanId, kind }),
    });
    const data = (await res.json()) as { redirectUrl?: string; error?: string };
    if (res.ok && data.redirectUrl) {
      window.location.href = data.redirectUrl;
      return;
    }
    setError(data.error ?? "Could not start the payment.");
    setPending(false);
  }
  return (
    <div>
      <button onClick={pay} disabled={pending} className={btnCls}>{pending ? "Redirecting to Yoco…" : label}</button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-slate-500">Secure card / Instant EFT payment via Yoco.</p>
    </div>
  );
}

/** Funnel: unlock report → request fix quote → pay quote. Both payments are optional and independent. */
function DeepScanCta({ view }: { view: ScanView }) {
  return (
    <Card className="border-2 border-violet-600/60">
      <h2 className="text-lg font-bold">🔬 This was a public scan. Run the deep scan + stress test</h2>
      <p className="mt-1 mb-4 text-sm text-slate-600 dark:text-slate-300">
        The free scan only checks what any visitor can see. The deep scan also looks for leaked password files, exposed
        backups and Git folders, WordPress weaknesses, cross-site data leaks, and how your site holds up with 50 simultaneous
        visitors. Because it actively tests the site, we need a quick one-click approval from the domain owner first.
      </p>
      <Link href={`/domains/${view.domainId}`} className={btnCls}>
        {view.domainVerified ? "Start the deep scan" : "Approve & run the deep scan"}
      </Link>
    </Card>
  );
}

function NextStep({ view }: { view: ScanView }) {
  const lead = view.lead;
  if (!view.viewerIsOwner) {
    return (
      <div className="no-print grid gap-4">
        <Card className="border-2 border-emerald-600">
          <h2 className="text-lg font-bold">Unlock the full report, get a fix quote, or run a deep scan</h2>
          <p className="mt-1 mb-4 text-sm text-slate-600 dark:text-slate-300">
            Sign in with the email this report was sent to. No password needed.
          </p>
          <ScanSignIn scanId={view.id} token={view.accessToken ?? ""} emailHint={view.ownerEmailHint} />
        </Card>
      </div>
    );
  }
  if (view.ownerIsAdmin) {
    return (
      <div className="no-print grid gap-4">
        {view.kind === "public" && <DeepScanCta view={view} />}
        <Card className="border-emerald-600/40 text-sm text-slate-600 dark:text-slate-300">
          👑 <strong>Owner account:</strong> full reports, deep scans and unlimited scanning are free for you. Customers see
          the teaser and payment options instead.
        </Card>
      </div>
    );
  }
  return (
    <div className="no-print grid gap-4">
      {view.kind === "public" && <DeepScanCta view={view} />}
      {!view.unlocked && (view.report?.locked.length ?? 0) + (view.report?.unlocked ? 1 : 0) > 0 && (
        <Card className="border-2 border-emerald-600">
          <h2 className="text-lg font-bold">Unlock the full report: {zar(view.reportPriceCents)}</h2>
          <p className="mt-1 mb-4 text-sm text-slate-600 dark:text-slate-300">
            See every issue with the evidence we found and step-by-step fixes your developer can follow. Instant access,
            plus PDF export.
          </p>
          <PayButton scanId={view.id} kind="report_unlock" label={`Unlock full report: ${zar(view.reportPriceCents)}`} />
        </Card>
      )}

      {lead?.status === "quoted" && lead.quoteCents ? (
        <Card className="border-2 border-emerald-600">
          <h2 className="text-lg font-bold">Your fixed-price quote: {zar(lead.quoteCents)}</h2>
          {lead.quoteNote && <p className="mt-1 whitespace-pre-wrap text-sm">{lead.quoteNote}</p>}
          <p className="mt-1 mb-4 text-sm text-slate-600 dark:text-slate-300">
            Pay to book our team. We&apos;ll fix the issues in this report and re-scan to confirm.
          </p>
          <PayButton scanId={view.id} kind="fix" label={`Pay ${zar(lead.quoteCents)} and fix my site`} />
        </Card>
      ) : lead?.status === "paid" || lead?.status === "won" ? (
        <Card className="text-center">
          <div className="text-3xl">🛠️</div>
          <h2 className="mt-2 font-semibold">Fix work booked</h2>
          <p className="text-sm text-slate-500">Payment received. Our team will be in touch to schedule your fixes.</p>
        </Card>
      ) : (view.full?.findings.length ?? 0) + (view.report?.locked.length ?? 0) + (view.report?.unlocked ? 1 : 0) > 0 ? (
        <LeadCard scanId={view.id} submitted={!!lead} unlocked={view.unlocked} />
      ) : null}
    </div>
  );
}

function LeadCard({ scanId, submitted, unlocked }: { scanId: string; submitted: boolean; unlocked: boolean }) {
  const [state, action, pending] = useActionState(submitLeadAction, undefined);
  if (submitted || state?.ok) {
    return (
      <Card className="text-center">
        <div className="text-3xl">✅</div>
        <h2 className="mt-2 font-semibold">Quote requested</h2>
        <p className="text-sm text-slate-500">
          Our team is reviewing your report and will email you a fixed-price quote, usually within one business day.
          You&apos;ll be able to pay for it right here.
        </p>
      </Card>
    );
  }
  return (
    <Card>
      <h2 className="text-lg font-bold">{unlocked ? "Want us to fix these for you?" : "Or let our team fix everything"}</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Get a fixed-price quote to fix every issue in this report. No obligation; you only pay if you accept.
      </p>
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="scanId" value={scanId} />
        <input name="name" required placeholder="Your name" className={inputCls} />
        <input name="phone" placeholder="Phone / WhatsApp" className={inputCls} />
        <input name="company" placeholder="Business name" className={`${inputCls} sm:col-span-2`} />
        <textarea name="message" placeholder="Anything we should know? (platform, deadlines…)" rows={3} className={`${inputCls} sm:col-span-2`} />
        <div className="sm:col-span-2">
          <button className={btnGhostCls} disabled={pending}>{pending ? "Sending…" : "Request a fix quote"}</button>
          {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
        </div>
      </form>
    </Card>
  );
}
