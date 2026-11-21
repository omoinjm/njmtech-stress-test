import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { setQuoteAction, updateLeadStatusAction } from "@/app/actions";
import { formatZar } from "@/lib/env";
import { allPostsForAdmin } from "@/lib/blog";
import { Card } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getDb, t } from "@/lib/db";

const STATUSES = ["new", "contacted", "quoted", "paid", "won", "lost"] as const;

async function Inner() {
  const db = await getDb();
  await requireAdmin();
  const leads = await db
    .select({ lead: t.leads, email: t.users.email, origin: t.scans.origin })
    .from(t.leads)
    .innerJoin(t.users, eq(t.leads.userId, t.users.id))
    .innerJoin(t.scans, eq(t.leads.scanId, t.scans.id))
    .orderBy(desc(t.leads.createdAt))
    .limit(100);

  const scans = await db
    .select({
      scan: t.scans,
      email: t.users.email,
      findings: sql<number>`(select count(*) from ${t.findings} where ${t.findings.scanId} = ${t.scans.id})`,
      critical: sql<number>`(select count(*) from ${t.findings} where ${t.findings.scanId} = ${t.scans.id} and ${t.findings.severity} in ('critical','high'))`,
    })
    .from(t.scans)
    .innerJoin(t.users, eq(t.scans.userId, t.users.id))
    .orderBy(desc(t.scans.createdAt))
    .limit(100);

  const payments = await db
    .select({ p: t.payments, email: t.users.email, origin: t.scans.origin })
    .from(t.payments)
    .innerJoin(t.users, eq(t.payments.userId, t.users.id))
    .innerJoin(t.scans, eq(t.payments.scanId, t.scans.id))
    .orderBy(desc(t.payments.createdAt))
    .limit(100);
  const revenue = payments.filter((x) => x.p.status === "paid" && x.p.mode !== "test").reduce((sum, x) => sum + x.p.amountCents, 0);

  return (
    <div className="grid gap-6">
      <Card>
        <h2 className="mb-3 font-semibold">Payments <span className="text-sm font-normal text-slate-500">· live revenue {formatZar(revenue)}</span></h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr><th className="py-2">When</th><th>Customer</th><th>Site</th><th>For</th><th>Amount</th><th>Status</th></tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {payments.map(({ p, email, origin }) => (
                <tr key={p.id}>
                  <td className="py-2 whitespace-nowrap">{p.createdAt.toLocaleString("en-ZA")}</td>
                  <td>{email}</td>
                  <td className="font-mono text-xs">{origin}</td>
                  <td>{p.kind === "report_unlock" ? "Report unlock" : "Fix work"}</td>
                  <td>{formatZar(p.amountCents)}</td>
                  <td className={p.status === "paid" ? "text-emerald-600" : "text-slate-500"}>{p.status}{p.mode === "test" ? " (test)" : ""}</td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={6} className="py-3 text-slate-500">No payments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">Fix requests (leads)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr><th className="py-2">When</th><th>Contact</th><th>Site</th><th>Message</th><th>Quote</th><th>Status</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {leads.map(({ lead, email, origin }) => (
                <tr key={lead.id} className="align-top">
                  <td className="py-2 whitespace-nowrap">{lead.createdAt.toLocaleDateString("en-ZA")}</td>
                  <td>{lead.name}<br /><span className="text-slate-500">{email}<br />{lead.phone}</span></td>
                  <td className="font-mono text-xs">{origin}<br /><span className="font-sans text-slate-500">{lead.company}</span></td>
                  <td className="max-w-xs text-xs">{lead.message}</td>
                  <td>
                    {lead.status === "paid" || lead.status === "won" ? (
                      <span className="font-semibold text-emerald-600">{lead.quoteCents ? formatZar(lead.quoteCents) : "-"} paid</span>
                    ) : (
                      <form action={setQuoteAction} className="grid gap-1">
                        <input type="hidden" name="leadId" value={lead.id} />
                        <input name="amount" defaultValue={lead.quoteCents ? lead.quoteCents / 100 : ""} placeholder="Rand" inputMode="decimal" className="w-24 rounded border border-black/15 bg-transparent px-1 py-0.5 text-xs" />
                        <input name="note" defaultValue={lead.quoteNote ?? ""} placeholder="Scope note" className="w-40 rounded border border-black/15 bg-transparent px-1 py-0.5 text-xs" />
                        <button className="text-left text-xs underline">{lead.quoteCents ? "Update quote" : "Send quote"}</button>
                      </form>
                    )}
                  </td>
                  <td>
                    <form action={updateLeadStatusAction} className="flex gap-1">
                      <input type="hidden" name="leadId" value={lead.id} />
                      <select name="status" defaultValue={lead.status} className="rounded border border-black/15 bg-transparent px-1 py-0.5 text-xs">
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button className="text-xs underline">Save</button>
                    </form>
                  </td>
                  <td><Link className="underline" href={`/admin/scans/${lead.scanId}`}>Report</Link></td>
                </tr>
              ))}
              {leads.length === 0 && <tr><td colSpan={7} className="py-3 text-slate-500">No leads yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">All scans</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr><th className="py-2">When</th><th>Customer</th><th>Site</th><th>Kind</th><th>Status</th><th>Issues</th><th>Source</th><th>IP</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {scans.map(({ scan, email, findings, critical }) => (
                <tr key={scan.id}>
                  <td className="py-2 whitespace-nowrap">{scan.createdAt.toLocaleString("en-ZA")}</td>
                  <td>{email}</td>
                  <td className="font-mono text-xs">{scan.origin}</td>
                  <td className="text-xs">{scan.kind}</td>
                  <td>{scan.status}</td>
                  <td>{findings} {critical > 0 && <span className="text-red-600">({critical} high+)</span>}</td>
                  <td className="max-w-[10rem] truncate text-xs text-slate-500" title={scan.source ?? ""}>{scan.source ?? "-"}</td>
                  <td className="text-xs text-slate-500">{scan.requesterIp ?? "-"}</td>
                  <td><Link className="underline" href={`/admin/scans/${scan.id}`}>Full report</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">Blog posts</h2>
        <ul className="divide-y divide-black/5 text-sm dark:divide-white/10">
          {allPostsForAdmin().map((p) => (
            <li key={p.slug} className="flex items-center justify-between gap-3 py-2">
              <Link href={`/blog/${p.slug}`} className="hover:underline">{p.title}</Link>
              <span className={p.draft ? "text-amber-600" : "text-emerald-600"}>{p.draft ? "draft" : `live · ${p.publishedAt}`}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Admin</h1>
      <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
        <Inner />
      </Suspense>
    </>
  );
}
